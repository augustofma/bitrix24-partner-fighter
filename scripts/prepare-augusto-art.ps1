param(
    [string]$SheetPath = (Join-Path $PSScriptRoot 'augusto-art/sheet-corrected.png'),
    [string]$OriginalSheetPath = (Join-Path $PSScriptRoot 'augusto-art/sheet-original.png'),
    [string]$KickRecoveryPath = (Join-Path $PSScriptRoot 'augusto-art/kick-recovery.png'),
    [string]$PortraitPath = (Join-Path $PSScriptRoot 'augusto-art/portrait-source.png'),
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

public static class AugustoArt {
    const int CellWidth = 192, CellHeight = 224, Columns = 8, Rows = 5;
    const int Baseline = 216, Margin = 4;
    const double BodyScale = 0.75;
    static readonly int[][] Regions = {
        new[]{32,8,160,238}, new[]{202,4,330,239}, new[]{384,5,515,240}, new[]{567,7,696,239},
        new[]{744,7,903,240}, new[]{941,7,1095,241}, new[]{1112,7,1263,241}, new[]{1297,7,1457,240},
        new[]{10,241,177,473}, new[]{199,240,355,473}, new[]{376,237,534,440}, new[]{565,237,701,399},
        new[]{743,257,905,449}, new[]{937,316,1082,470}, new[]{1113,252,1276,473}, new[]{1286,257,1467,472},
        new[]{18,476,187,692}, new[]{194,476,331,692}, new[]{374,473,552,686}, new[]{0,0,0,0},
        new[]{755,509,903,669}, new[]{933,512,1098,669}, new[]{1115,506,1284,667}, new[]{1298,526,1459,661},
        new[]{12,756,206,883}, new[]{206,759,359,884}, new[]{378,679,530,843}, new[]{552,670,758,878},
        new[]{766,679,938,881}, new[]{947,669,1124,886}, new[]{1131,674,1320,878}, new[]{1320,678,1447,847},
        new[]{16,875,154,1067}, new[]{208,915,346,1065}, new[]{393,888,541,1065}, new[]{552,903,728,1067},
        new[]{789,925,1012,1067}, new[]{720,920,925,1072}, new[]{1113,975,1320,1072}, new[]{1319,852,1467,1072}
    };

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

    public static void Prepare(string sheetPath,string originalPath,string recoveryPath,string portraitPath,string output) {
        using(var sheet=new Bitmap(sheetPath)) using(var original=new Bitmap(originalPath))
        using(var recovery=new Bitmap(recoveryPath)) using(var portrait=new Bitmap(portraitPath))
        using(var atlas=new Bitmap(CellWidth*Columns,CellHeight*Rows,PixelFormat.Format32bppArgb)) {
            if(sheet.Width!=1467 || sheet.Height!=1072 || original.Width!=1467 || original.Height!=1072)
                throw new Exception("Reviewed crop map requires the original 1467x1072 ImageGen exports.");
            for(int frame=0;frame<40;frame++) {
                Bitmap source=frame==19 ? recovery : (frame==27 || frame==37 || frame==38 ? original : sheet);
                int[] r=Regions[frame];
                Rectangle region=frame==19 ? new Rectangle(0,0,source.Width,source.Height) : Rectangle.FromLTRB(r[0],r[1],r[2],r[3]);
                using(var isolated=Isolate(source,region)) {
                Rectangle box=Bounds(isolated,new Rectangle(0,0,isolated.Width,isolated.Height));
                double scale=frame==19 ? 170.0/box.Height : BodyScale;
                scale=Math.Min(scale,(CellWidth-2.0*Margin)/box.Width);
                int width=(int)Math.Round(box.Width*scale), height=(int)Math.Round(box.Height*scale);
                int lift=frame==10 ? 24 : frame==11 ? 48 : frame==12 ? 18 : frame>=26 && frame<=31 ? 10 : 0;
                int localX=(CellWidth-width)/2, localY=Baseline-height-lift;
                // Root alignment compensates for the extended limb's asymmetric bounding box.
                bool impact=frame==15 || frame==18 || frame==21 || frame==24 || frame==27 || frame==30;
                if(impact) localX+=Math.Min(16,CellWidth-Margin-localX-width);
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

$outputPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'public/fighters/augusto'
if ($ValidateOnly) {
    [AugustoArt]::Validate($outputPath)
} else {
    [AugustoArt]::Prepare($SheetPath, $OriginalSheetPath, $KickRecoveryPath, $PortraitPath, $outputPath)
}
