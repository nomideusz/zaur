<script lang="ts">
	import { Bar } from 'svelte-chartjs';

	import { Chart, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';

	Chart.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
	export let data;
	let delayed;
	let options = {
		animation: {
			onComplete: () => {
				delayed = true;
			},
			delay: (context) => {
				let delay = 0;
				if (context.type === 'data' && context.mode === 'default' && !delayed) {
					delay = context.dataIndex * 300 + context.datasetIndex * 100;
				}
				return delay;
			}
		},
		plugins: {
			legend: {
				display: true
			},
			title: {
				display: true,
				text: 'Średnia cena za m2 (mieszkania)'
			}
		},
		responsive: true,
		indexAxis: 'x'
	};
</script>

<Bar {data} {options} />
