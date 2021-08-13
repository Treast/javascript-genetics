import App from './utils/App';
import Genome from './utils/genome.js/Genome';

const app = new App();

const genome = new Genome(50)
  .setMutationRate(0.05)
  .setSelectionRate(0.15)
  .setRendererSize({ height: 400, width: 400 })
  .setComputingSize({ height: 80, width: 80 });

const buttonRun = document.querySelector('#buttonRun');
const roundSpan = document.querySelector('#informationRound span') as HTMLSpanElement;
const complianceSpan = document.querySelector('#informationCompliance span') as HTMLSpanElement;

app.isReady().then(() => {
  const container = document.querySelector('#genome');
  genome.loadImage('./assets/images/painting.jpg').init(container);

  buttonRun.addEventListener('click', (e: Event) => onButtonRunClick(e));
});

const onButtonRunClick = (e: Event) => {
  e.preventDefault();
  console.log('Running');

  genome.generate(10000, () => {
    showInformations();
  });
};

const showInformations = () => {
  roundSpan.innerText = `${genome.getState().generation}`;
  complianceSpan.innerText = `${(genome.getState().compliance * 100).toFixed(2)}%`;
};
