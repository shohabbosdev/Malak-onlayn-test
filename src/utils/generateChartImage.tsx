import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Chart.js elementlarini ro'yxatdan o'tkazish
ChartJS.register(ArcElement, Tooltip, Legend);

import { TestResult } from '../types';

export async function generateChartImage(testResult: TestResult): Promise<string> {
  // Canvas yaratish
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas konteksti olinmadi');
  }

  // Chart.js orqali diagramma yaratish
  const chart = new ChartJS(canvas, {
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

  // Diagrammani tasvirga aylantirish
  return new Promise((resolve) => {
    setTimeout(() => {
      const base64 = canvas.toDataURL('image/png');
      chart.destroy(); // Resurslarni tozalash
      resolve(base64);
    }, 500);
  });
}