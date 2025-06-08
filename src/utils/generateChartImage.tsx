import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Chart } from 'chart.js';
import { TestResult } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

export async function generateChartImage(testResult: TestResult): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Kontekst olinmadi");

  const chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['To‘g‘ri', 'Noto‘g‘ri'],
      datasets: [
        {
          data: [testResult.correct, testResult.incorrect],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderWidth: 1,
        },
      ],
    },
    options: {
        responsive: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      const base64 = canvas.toDataURL('image/png');
      chart.destroy(); // resursni tozalash
      resolve(base64);
    }, 500);
  });
}
