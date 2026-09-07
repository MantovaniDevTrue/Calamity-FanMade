import { Microsoft } from './../ModImports.js';

export class Color {
    static get Type() {
        return Microsoft.Xna.Framework.Graphics.Color;
    }
    
    static new(R = 255, G = 255, B = 255, A = 255) {
        const c = Microsoft.Xna.Framework.Graphics.Color.new();
        c['void .ctor(int r, int g, int b, int a)'](R, G, B, A);
        return c;
    }
    
    static getByName(name) {
        return Microsoft.Xna.Framework.Graphics.Color[name] ?? Color.new(0, 0, 0, 0);
    }
    
    constructor(R = 255, G = 255, B = 255, A = 255) {
        this._r = R;
        this._g = G;
        this._b = B;
        this._a = A;
        this._value = Color.new(R, G, B, A);
    }
    
    get R() { return this._r; }
    set R(value) {
        this._r = value;
        this._value.R = value;
    }
    
    get G() { return this._g; }
    set G(value) {
        this._g = value;
        this._value.G = value;
    }
    
    get B() { return this._b; }
    set B(value) {
        this._b = value;
        this._value.B = value;
    }
    
    get A() { return this._a; }
    set A(value) {
        this._a = value;
        this._value.A = value;
    }
    
    get Value() { return this._value; }
    set Value(value) {
        this._value = value;
        this._r = value.R;
        this._g = value.G;
        this._b = value.B;
        this._a = value.A;
    }
    
    op_Multiply(amount) {
        this.Value = Microsoft.Xna.Framework.Graphics.Color[
        'Color op_Multiply(Color a, float amount)'
        ](this.Value, amount);
    }
    
    Multiply(amount) {
        this.Value = Microsoft.Xna.Framework.Graphics.Color[
        'Color Multiply(Color a, float amount)'
        ](this.Value, amount);
    }
    
    Lerp(color, amount) {
        this.Value = Microsoft.Xna.Framework.Graphics.Color[
        'Color Lerp(Color value1, Color value2, float amount)'
        ](this.Value, color, amount);
    }
    
    static op_Multiply(color, amount) {
        return Microsoft.Xna.Framework.Graphics.Color[
        'Color op_Multiply(Color a, float amount)'
        ](color, amount);
    }
    
    static Multiply(color, amount) {
        return Microsoft.Xna.Framework.Graphics.Color[
        'Color Multiply(Color a, float amount)'
        ](color, amount);
    }
    
    static Lerp(color1, color2, amount) {
        return Microsoft.Xna.Framework.Graphics.Color[
        'Color Lerp(Color value1, Color value2, float amount)'
        ](color1, color2, amount);
    }
    
    static get Transparent() { return Microsoft.Xna.Framework.Graphics.Color.Transparent; }
    static get TransparentBlack() { return Microsoft.Xna.Framework.Graphics.Color.TransparentBlack; }
    static get TransparentWhite() { return Microsoft.Xna.Framework.Graphics.Color.TransparentWhite; }
    static get AliceBlue() { return Microsoft.Xna.Framework.Graphics.Color.AliceBlue; }
    static get AntiqueWhite() { return Microsoft.Xna.Framework.Graphics.Color.AntiqueWhite; }
    static get Aqua() { return Microsoft.Xna.Framework.Graphics.Color.Aqua; }
    static get Aquamarine() { return Microsoft.Xna.Framework.Graphics.Color.Aquamarine; }
    static get Azure() { return Microsoft.Xna.Framework.Graphics.Color.Azure; }
    static get Beige() { return Microsoft.Xna.Framework.Graphics.Color.Beige; }
    static get Bisque() { return Microsoft.Xna.Framework.Graphics.Color.Bisque; }
    static get Black() { return Microsoft.Xna.Framework.Graphics.Color.Black; }
    static get BlanchedAlmond() { return Microsoft.Xna.Framework.Graphics.Color.BlanchedAlmond; }
    static get Blue() { return Microsoft.Xna.Framework.Graphics.Color.Blue; }
    static get BlueViolet() { return Microsoft.Xna.Framework.Graphics.Color.BlueViolet; }
    static get Brown() { return Microsoft.Xna.Framework.Graphics.Color.Brown; }
    static get BurlyWood() { return Microsoft.Xna.Framework.Graphics.Color.BurlyWood; }
    static get CadetBlue() { return Microsoft.Xna.Framework.Graphics.Color.CadetBlue; }
    static get Chartreuse() { return Microsoft.Xna.Framework.Graphics.Color.Chartreuse; }
    static get Chocolate() { return Microsoft.Xna.Framework.Graphics.Color.Chocolate; }
    static get Coral() { return Microsoft.Xna.Framework.Graphics.Color.Coral; }
    static get CornflowerBlue() { return Microsoft.Xna.Framework.Graphics.Color.CornflowerBlue; }
    static get Cornsilk() { return Microsoft.Xna.Framework.Graphics.Color.Cornsilk; }
    static get Crimson() { return Microsoft.Xna.Framework.Graphics.Color.Crimson; }
    static get Cyan() { return Microsoft.Xna.Framework.Graphics.Color.Cyan; }
    static get DarkBlue() { return Microsoft.Xna.Framework.Graphics.Color.DarkBlue; }
    static get DarkCyan() { return Microsoft.Xna.Framework.Graphics.Color.DarkCyan; }
    static get DarkGoldenrod() { return Microsoft.Xna.Framework.Graphics.Color.DarkGoldenrod; }
    static get DarkGray() { return Microsoft.Xna.Framework.Graphics.Color.DarkGray; }
    static get DarkGreen() { return Microsoft.Xna.Framework.Graphics.Color.DarkGreen; }
    static get DarkKhaki() { return Microsoft.Xna.Framework.Graphics.Color.DarkKhaki; }
    static get DarkMagenta() { return Microsoft.Xna.Framework.Graphics.Color.DarkMagenta; }
    static get DarkOliveGreen() { return Microsoft.Xna.Framework.Graphics.Color.DarkOliveGreen; }
    static get DarkOrange() { return Microsoft.Xna.Framework.Graphics.Color.DarkOrange; }
    static get DarkOrchid() { return Microsoft.Xna.Framework.Graphics.Color.DarkOrchid; }
    static get DarkRed() { return Microsoft.Xna.Framework.Graphics.Color.DarkRed; }
    static get DarkSalmon() { return Microsoft.Xna.Framework.Graphics.Color.DarkSalmon; }
    static get DarkSeaGreen() { return Microsoft.Xna.Framework.Graphics.Color.DarkSeaGreen; }
    static get DarkSlateBlue() { return Microsoft.Xna.Framework.Graphics.Color.DarkSlateBlue; }
    static get DarkSlateGray() { return Microsoft.Xna.Framework.Graphics.Color.DarkSlateGray; }
    static get DarkTurquoise() { return Microsoft.Xna.Framework.Graphics.Color.DarkTurquoise; }
    static get DarkViolet() { return Microsoft.Xna.Framework.Graphics.Color.DarkViolet; }
    static get DeepPink() { return Microsoft.Xna.Framework.Graphics.Color.DeepPink; }
    static get DeepSkyBlue() { return Microsoft.Xna.Framework.Graphics.Color.DeepSkyBlue; }
    static get DimGray() { return Microsoft.Xna.Framework.Graphics.Color.DimGray; }
    static get DodgerBlue() { return Microsoft.Xna.Framework.Graphics.Color.DodgerBlue; }
    static get Firebrick() { return Microsoft.Xna.Framework.Graphics.Color.Firebrick; }
    static get FloralWhite() { return Microsoft.Xna.Framework.Graphics.Color.FloralWhite; }
    static get ForestGreen() { return Microsoft.Xna.Framework.Graphics.Color.ForestGreen; }
    static get Fuchsia() { return Microsoft.Xna.Framework.Graphics.Color.Fuchsia; }
    static get Gainsboro() { return Microsoft.Xna.Framework.Graphics.Color.Gainsboro; }
    static get GhostWhite() { return Microsoft.Xna.Framework.Graphics.Color.GhostWhite; }
    static get Gold() { return Microsoft.Xna.Framework.Graphics.Color.Gold; }
    static get Goldenrod() { return Microsoft.Xna.Framework.Graphics.Color.Goldenrod; }
    static get Gray() { return Microsoft.Xna.Framework.Graphics.Color.Gray; }
    static get Green() { return Microsoft.Xna.Framework.Graphics.Color.Green; }
    static get GreenYellow() { return Microsoft.Xna.Framework.Graphics.Color.GreenYellow; }
    static get Honeydew() { return Microsoft.Xna.Framework.Graphics.Color.Honeydew; }
    static get HotPink() { return Microsoft.Xna.Framework.Graphics.Color.HotPink; }
    static get IndianRed() { return Microsoft.Xna.Framework.Graphics.Color.IndianRed; }
    static get Indigo() { return Microsoft.Xna.Framework.Graphics.Color.Indigo; }
    static get Ivory() { return Microsoft.Xna.Framework.Graphics.Color.Ivory; }
    static get Khaki() { return Microsoft.Xna.Framework.Graphics.Color.Khaki; }
    static get Lavender() { return Microsoft.Xna.Framework.Graphics.Color.Lavender; }
    static get LavenderBlush() { return Microsoft.Xna.Framework.Graphics.Color.LavenderBlush; }
    static get LawnGreen() { return Microsoft.Xna.Framework.Graphics.Color.LawnGreen; }
    static get LemonChiffon() { return Microsoft.Xna.Framework.Graphics.Color.LemonChiffon; }
    static get LightBlue() { return Microsoft.Xna.Framework.Graphics.Color.LightBlue; }
    static get LightCoral() { return Microsoft.Xna.Framework.Graphics.Color.LightCoral; }
    static get LightCyan() { return Microsoft.Xna.Framework.Graphics.Color.LightCyan; }
    static get LightGoldenrodYellow() { return Microsoft.Xna.Framework.Graphics.Color.LightGoldenrodYellow; }
    static get LightGreen() { return Microsoft.Xna.Framework.Graphics.Color.LightGreen; }
    static get LightGray() { return Microsoft.Xna.Framework.Graphics.Color.LightGray; }
    static get LightPink() { return Microsoft.Xna.Framework.Graphics.Color.LightPink; }
    static get LightSalmon() { return Microsoft.Xna.Framework.Graphics.Color.LightSalmon; }
    static get LightSeaGreen() { return Microsoft.Xna.Framework.Graphics.Color.LightSeaGreen; }
    static get LightSkyBlue() { return Microsoft.Xna.Framework.Graphics.Color.LightSkyBlue; }
    static get LightSlateGray() { return Microsoft.Xna.Framework.Graphics.Color.LightSlateGray; }
    static get LightSteelBlue() { return Microsoft.Xna.Framework.Graphics.Color.LightSteelBlue; }
    static get LightYellow() { return Microsoft.Xna.Framework.Graphics.Color.LightYellow; }
    static get Lime() { return Microsoft.Xna.Framework.Graphics.Color.Lime; }
    static get LimeGreen() { return Microsoft.Xna.Framework.Graphics.Color.LimeGreen; }
    static get Linen() { return Microsoft.Xna.Framework.Graphics.Color.Linen; }
    static get Magenta() { return Microsoft.Xna.Framework.Graphics.Color.Magenta; }
    static get Maroon() { return Microsoft.Xna.Framework.Graphics.Color.Maroon; }
    static get MediumAquamarine() { return Microsoft.Xna.Framework.Graphics.Color.MediumAquamarine; }
    static get MediumBlue() { return Microsoft.Xna.Framework.Graphics.Color.MediumBlue; }
    static get MediumOrchid() { return Microsoft.Xna.Framework.Graphics.Color.MediumOrchid; }
    static get MediumPurple() { return Microsoft.Xna.Framework.Graphics.Color.MediumPurple; }
    static get MediumSeaGreen() { return Microsoft.Xna.Framework.Graphics.Color.MediumSeaGreen; }
    static get MediumSlateBlue() { return Microsoft.Xna.Framework.Graphics.Color.MediumSlateBlue; }
    static get MediumSpringGreen() { return Microsoft.Xna.Framework.Graphics.Color.MediumSpringGreen; }
    static get MediumTurquoise() { return Microsoft.Xna.Framework.Graphics.Color.MediumTurquoise; }
    static get MediumVioletRed() { return Microsoft.Xna.Framework.Graphics.Color.MediumVioletRed; }
    static get MidnightBlue() { return Microsoft.Xna.Framework.Graphics.Color.MidnightBlue; }
    static get MintCream() { return Microsoft.Xna.Framework.Graphics.Color.MintCream; }
    static get MistyRose() { return Microsoft.Xna.Framework.Graphics.Color.MistyRose; }
    static get Moccasin() { return Microsoft.Xna.Framework.Graphics.Color.Moccasin; }
    static get NavajoWhite() { return Microsoft.Xna.Framework.Graphics.Color.NavajoWhite; }
    static get Navy() { return Microsoft.Xna.Framework.Graphics.Color.Navy; }
    static get OldLace() { return Microsoft.Xna.Framework.Graphics.Color.OldLace; }
    static get Olive() { return Microsoft.Xna.Framework.Graphics.Color.Olive; }
    static get OliveDrab() { return Microsoft.Xna.Framework.Graphics.Color.OliveDrab; }
    static get Orange() { return Microsoft.Xna.Framework.Graphics.Color.Orange; }
    static get OrangeRed() { return Microsoft.Xna.Framework.Graphics.Color.OrangeRed; }
    static get Orchid() { return Microsoft.Xna.Framework.Graphics.Color.Orchid; }
    static get PaleGoldenrod() { return Microsoft.Xna.Framework.Graphics.Color.PaleGoldenrod; }
    static get PaleGreen() { return Microsoft.Xna.Framework.Graphics.Color.PaleGreen; }
    static get PaleTurquoise() { return Microsoft.Xna.Framework.Graphics.Color.PaleTurquoise; }
    static get PaleVioletRed() { return Microsoft.Xna.Framework.Graphics.Color.PaleVioletRed; }
    static get PapayaWhip() { return Microsoft.Xna.Framework.Graphics.Color.PapayaWhip; }
    static get PeachPuff() { return Microsoft.Xna.Framework.Graphics.Color.PeachPuff; }
    static get Peru() { return Microsoft.Xna.Framework.Graphics.Color.Peru; }
    static get Pink() { return Microsoft.Xna.Framework.Graphics.Color.Pink; }
    static get Plum() { return Microsoft.Xna.Framework.Graphics.Color.Plum; }
    static get PowderBlue() { return Microsoft.Xna.Framework.Graphics.Color.PowderBlue; }
    static get Purple() { return Microsoft.Xna.Framework.Graphics.Color.Purple; }
    static get Red() { return Microsoft.Xna.Framework.Graphics.Color.Red; }
    static get RosyBrown() { return Microsoft.Xna.Framework.Graphics.Color.RosyBrown; }
    static get RoyalBlue() { return Microsoft.Xna.Framework.Graphics.Color.RoyalBlue; }
    static get SaddleBrown() { return Microsoft.Xna.Framework.Graphics.Color.SaddleBrown; }
    static get Salmon() { return Microsoft.Xna.Framework.Graphics.Color.Salmon; }
    static get SandyBrown() { return Microsoft.Xna.Framework.Graphics.Color.SandyBrown; }
    static get SeaGreen() { return Microsoft.Xna.Framework.Graphics.Color.SeaGreen; }
    static get SeaShell() { return Microsoft.Xna.Framework.Graphics.Color.SeaShell; }
    static get Sienna() { return Microsoft.Xna.Framework.Graphics.Color.Sienna; }
    static get Silver() { return Microsoft.Xna.Framework.Graphics.Color.Silver; }
    static get SkyBlue() { return Microsoft.Xna.Framework.Graphics.Color.SkyBlue; }
    static get SlateBlue() { return Microsoft.Xna.Framework.Graphics.Color.SlateBlue; }
    static get SlateGray() { return Microsoft.Xna.Framework.Graphics.Color.SlateGray; }
    static get Snow() { return Microsoft.Xna.Framework.Graphics.Color.Snow; }
    static get SpringGreen() { return Microsoft.Xna.Framework.Graphics.Color.SpringGreen; }
    static get SteelBlue() { return Microsoft.Xna.Framework.Graphics.Color.SteelBlue; }
    static get Tan() { return Microsoft.Xna.Framework.Graphics.Color.Tan; }
    static get Teal() { return Microsoft.Xna.Framework.Graphics.Color.Teal; }
    static get Thistle() { return Microsoft.Xna.Framework.Graphics.Color.Thistle; }
    static get Tomato() { return Microsoft.Xna.Framework.Graphics.Color.Tomato; }
    static get Turquoise() { return Microsoft.Xna.Framework.Graphics.Color.Turquoise; }
    static get Violet() { return Microsoft.Xna.Framework.Graphics.Color.Violet; }
    static get Wheat() { return Microsoft.Xna.Framework.Graphics.Color.Wheat; }
    static get White() { return Microsoft.Xna.Framework.Graphics.Color.White; }
    static get WhiteSmoke() { return Microsoft.Xna.Framework.Graphics.Color.WhiteSmoke; }
    static get Yellow() { return Microsoft.Xna.Framework.Graphics.Color.Yellow; }
    static get YellowGreen() { return Microsoft.Xna.Framework.Graphics.Color.YellowGreen; }
}