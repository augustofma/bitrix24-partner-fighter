param(
    [string]$SheetPath = (Join-Path $PSScriptRoot 'filipe-art/sheet-source.png'),
    [string]$PortraitPath = (Join-Path $PSScriptRoot 'filipe-art/portrait-source.png'),
    [string]$KickPath = (Join-Path $PSScriptRoot 'filipe-art/kick-active.png'),
    [switch]$ValidateOnly
)

# ImageGen's visual grid is not a technical atlas. These reviewed regions isolate its poses.
# System.Drawing is used only offline; the game has no additional runtime dependency.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Collections.Generic;

public static class FilipeArt {
    const int CellWidth = 192, CellHeight = 224, Columns = 8, Rows = 5;
    const int Baseline = 216, Margin = 4;
    const double BodyScale = 0.875;
    static readonly int[][] Regions = {
        new[]{0,0,183,243},
        new[]{183,0,366,243},
        new[]{366,0,549,243},
        // Return to the relaxed guard instead of dropping both arms during the idle loop.
        new[]{183,0,366,243},
        new[]{732,0,916,243},
        new[]{916,0,1100,243},
        new[]{1100,0,1283,243},
        new[]{1283,0,1467,243},
        new[]{0,243,193,472},
        new[]{193,243,380,472},
        new[]{380,241,552,472},
        new[]{552,243,733,472},
        new[]{733,243,915,472},
        new[]{915,280,1100,472},
        new[]{1100,243,1284,472},
        new[]{1284,243,1467,472},
        new[]{0,473,193,692},
        new[]{193,473,366,692},
        new[]{366,473,573,692},
        new[]{573,473,734,692},
        new[]{734,497,915,692},
        new[]{915,497,1105,692},
        // Recovery returns fully to crouch; the generated recovery lifted the torso too far.
        new[]{915,280,1100,472},
        new[]{1284,497,1467,692},
        new[]{0,700,206,875},
        new[]{206,700,370,875},
        new[]{370,692,554,875},
        new[]{554,692,748,875},
        new[]{748,692,918,875},
        new[]{918,692,1101,875},
        new[]{1101,692,1303,875},
        new[]{1303,692,1467,855},
        new[]{0,875,183,1072},
        new[]{183,875,369,1072},
        new[]{369,875,548,1072},
        new[]{548,875,727,1072},
        new[]{727,875,922,1072},
        new[]{890,915,1094,1072},
        new[]{1093,964,1302,1072},
        new[]{1303,849,1467,1072}
    };
    // Reviewed body roots keep extended limbs from shifting the torso between phases.
    static readonly int[] Roots = {93,276,459,276,827,1007,1194,1374,90,272,474,648,832,1004,1190,1380,94,276,440,641,818,989,1004,1366,91,276,461,641,815,1000,1190,1380,89,275,442,637,817,992,1196,1370};

    static Rectangle Bounds(Bitmap image, Rectangle region) {
        int left=region.Right, top=region.Bottom, right=region.Left, bottom=region.Top;
        for(int y=region.Top;y<region.Bottom;y++) for(int x=region.Left;x<region.Right;x++) {
            if(image.GetPixel(x,y).A==0) continue;
            left=Math.Min(left,x); top=Math.Min(top,y); right=Math.Max(right,x+1); bottom=Math.Max(bottom,y+1);
        }
        if(right<=left || bottom<=top) throw new Exception("Empty sprite region");
        return Rectangle.FromLTRB(left,top,right,bottom);
    }

    static Bitmap Isolate(Bitmap source, Rectangle region) {
        var image=source.Clone(region,PixelFormat.Format32bppArgb);
        int w=image.Width,h=image.Height;
        var visited=new bool[w*h];
        var largest=new List<int>();
        for(int start=0;start<visited.Length;start++) {
            if(visited[start] || image.GetPixel(start%w,start/w).A<16) continue;
            var queue=new Queue<int>(); var component=new List<int>();
            queue.Enqueue(start);visited[start]=true;
            while(queue.Count>0) {
                int p=queue.Dequeue();component.Add(p);
                for(int dy=-1;dy<=1;dy++) for(int dx=-1;dx<=1;dx++) {
                    int x=p%w+dx,y=p/w+dy;
                    if(x<0 || x>=w || y<0 || y>=h) continue;
                    int next=y*w+x;
                    if(!visited[next] && image.GetPixel(x,y).A>=16) {visited[next]=true;queue.Enqueue(next);}
                }
            }
            if(component.Count>largest.Count) largest=component;
        }
        // Discard disconnected generation speckles and neighbouring-frame fragments.
        // Preserve the original alpha at the character edge, including its one-pixel fringe.
        var keep=new bool[w*h];
        foreach(int p in largest) for(int dy=-1;dy<=1;dy++) for(int dx=-1;dx<=1;dx++) {
            int x=p%w+dx,y=p/w+dy;
            if(x>=0 && x<w && y>=0 && y<h) keep[y*w+x]=true;
        }
        for(int p=0;p<keep.Length;p++) if(!keep[p]) image.SetPixel(p%w,p/w,Color.Transparent);
        return image;
    }

    static void CopyScaled(Bitmap source, Rectangle box, Bitmap target, int x, int y, int w, int h) {
        // Nearest-neighbour sampling keeps crisp pixel clusters and copies alpha unchanged.
        for(int dy=0;dy<h;dy++) for(int dx=0;dx<w;dx++) {
            int sx=box.X+Math.Min(box.Width-1,(int)((dx+0.5)*box.Width/w));
            int sy=box.Y+Math.Min(box.Height-1,(int)((dy+0.5)*box.Height/h));
            target.SetPixel(x+dx,y+dy,source.GetPixel(sx,sy));
        }
    }

    public static void Prepare(string sheetPath,string portraitPath,string kickPath,string output) {
        using(var sheet=new Bitmap(sheetPath)) using(var portrait=new Bitmap(portraitPath))
        using(var kick=new Bitmap(kickPath))
        using(var atlas=new Bitmap(CellWidth*Columns,CellHeight*Rows,PixelFormat.Format32bppArgb)) {
            if(sheet.Width!=1467 || sheet.Height!=1072)
                throw new Exception("Reviewed crop map requires the original 1467x1072 ImageGen exports.");
            for(int frame=0;frame<40;frame++) {
                Bitmap source=frame==18 ? kick : sheet;
                int[] r=Regions[frame];
                Rectangle region=frame==18 ? new Rectangle(0,0,source.Width,source.Height) : Rectangle.FromLTRB(r[0],r[1],r[2],r[3]);
                using(var isolated=Isolate(source,region)) {
                Rectangle box=Bounds(isolated,new Rectangle(0,0,isolated.Width,isolated.Height));
                double scale=BodyScale;
                // Correct small source-scale drift across upright walking/recovery poses.
                if((frame>=4 && frame<=9) || frame==18 || frame==19) scale=172.0/box.Height;
                scale=Math.Min(scale,(CellWidth-2.0*Margin)/box.Width);
                int width=(int)Math.Round(box.Width*scale), height=(int)Math.Round(box.Height*scale);
                int lift=frame==10 ? 24 : frame==11 ? 48 : frame==12 ? 18 : frame==27 ? 2 : frame>=26 && frame<=31 ? 10 : 0;
                double root=Roots[frame]-region.X-box.X;
                if(frame==18) {
                    // A separate pose has a different source resolution: anchor at its support shoe.
                    long sum=0,count=0;
                    for(int y=box.Bottom-Math.Max(1,box.Height/40);y<box.Bottom;y++)
                        for(int x=box.Left;x<box.Right;x++) if(isolated.GetPixel(x,y).A>0) {sum+=x;count++;}
                    root=(double)sum/count-box.X;
                }
                int localX=(int)Math.Round(CellWidth/2.0-root*scale), localY=Baseline-height-lift;
                localX=Math.Max(Margin,Math.Min(CellWidth-Margin-width,localX));
                if(localY<Margin) throw new Exception("Sprite exceeds top margin: "+frame);
                CopyScaled(isolated,box,atlas,(frame%Columns)*CellWidth+localX,(frame/Columns)*CellHeight+localY,width,height);
                Console.WriteLine("frame {0}: {1}x{2}, bounds ({3},{4}), baseline {5}",frame,width,height,localX,localY,localY+height);
                }
            }
            Directory.CreateDirectory(output);
            atlas.Save(Path.Combine(output,"sprite.png"),ImageFormat.Png);
            using(var bust=new Bitmap(240,300,PixelFormat.Format32bppArgb)) {
                Rectangle box=Bounds(portrait,new Rectangle(0,0,portrait.Width,portrait.Height));
                double scale=Math.Min(232.0/box.Width,292.0/box.Height);
                int w=(int)Math.Round(box.Width*scale),h=(int)Math.Round(box.Height*scale);
                CopyScaled(portrait,box,bust,(240-w)/2,300-h,w,h);
                bust.Save(Path.Combine(output,"portrait.png"),ImageFormat.Png);
            }
        }
        Validate(output);
    }

    public static void Validate(string output) {
        using(var sheet=new Bitmap(Path.Combine(output,"sprite.png")))
        using(var portrait=new Bitmap(Path.Combine(output,"portrait.png"))) {
            if(sheet.Width!=1536 || sheet.Height!=1120 || portrait.Width!=240 || portrait.Height!=300)
                throw new Exception("Invalid output dimensions");
            for(int frame=0;frame<40;frame++) {
                var cell=new Rectangle(frame%Columns*CellWidth,frame/Columns*CellHeight,CellWidth,CellHeight);
                var box=Bounds(sheet,cell);
                if(box.Left<cell.Left+Margin || box.Right>cell.Right-Margin || box.Top<cell.Top+Margin || box.Bottom>cell.Bottom-Margin)
                    throw new Exception("Nontransparent pixel in cell safety margin: "+frame);
            }
            if(sheet.GetPixel(0,0).A!=0 || portrait.GetPixel(0,0).A!=0)
                throw new Exception("Missing transparency");
            Console.WriteLine("PASS: RGBA, 1536x1120, 40 isolated 192x224 cells; portrait 240x300.");
        }
    }
}
'@

$outputPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'public/fighters/filipe'
if ($ValidateOnly) {
    [FilipeArt]::Validate($outputPath)
} else {
    [FilipeArt]::Prepare($SheetPath, $PortraitPath, $KickPath, $outputPath)
}
