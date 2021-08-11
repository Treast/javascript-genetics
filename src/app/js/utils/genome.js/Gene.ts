class Gene {
  private value: number;

  public constructor(value: number | null = null) {
    this.value = value || Math.random();
  }

  public get() {
    return this.value;
  }
}

export default Gene;
