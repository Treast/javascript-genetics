// @ts-ignore
import { GPU, IKernelRunShortcut } from 'gpu.js';

class GPUComputing {
  private gpu: GPU;
  private kernel: IKernelRunShortcut;
  public constructor() {
    this.gpu = new GPU();
    this.kernel = this.gpu
      .createKernel(function (a: number[], b: number[]) {
        let sum = 0;
        for (let i = 0; i < 75 * 75 * 4; i++) {
          sum += Math.abs(a[i] - b[i]);
        }

        return sum / 255;
      })
      .setOutput([1]);
  }

  public getKernel() {
    return this.kernel;
  }
}

export default new GPUComputing();
