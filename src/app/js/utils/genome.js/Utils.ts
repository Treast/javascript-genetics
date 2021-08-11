class Utils {
  public static compareColor(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    const dR = Math.pow(r1 - r2, 2);
    const dG = Math.pow(g1 - g2, 2);
    const dB = Math.pow(b1 - b2, 2);

    return 1 - Math.sqrt(dR + dG + dB) / Math.sqrt(255 ** 2 + 255 ** 2 + 255 ** 2);
  }

  public static compareColorOld(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    const dR = 1 - Math.abs(r1 - r2) / 255;
    const dG = 1 - Math.abs(g1 - g2) / 255;
    const dB = 1 - Math.abs(b1 - b2) / 255;

    return (dR * dR + dG * dG + dB * dB) / 3;
  }

  public static compareColorStrict(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    const dR = 1 - Math.abs(r1 - r2) / 255;
    const dG = 1 - Math.abs(g1 - g2) / 255;
    const dB = 1 - Math.abs(b1 - b2) / 255;

    return (dR + dG + dB) / 3;
  }
}

export default Utils;
