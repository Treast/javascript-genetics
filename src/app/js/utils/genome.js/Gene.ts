export interface IGene {
  x: number;
  y: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

class Gene {
  private value: IGene;

  public constructor(value: IGene | null = null) {
    this.value = value || {
      x: Math.random(),
      y: Math.random(),
      radius: Math.random(),
      r: Math.random(),
      g: Math.random(),
      b: Math.random(),
      a: Math.random(),
    };
  }

  public get(): IGene {
    return this.value;
  }
}

export default Gene;
