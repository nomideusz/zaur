<script>
	import { Bar } from 'svelte-chartjs';

	import { Chart, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';

	Chart.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
	export let data;

	// Sortowanie danych malejąco
	if (data && data.datasets && data.datasets.length > 0) {
		let combinedData = data.labels.map((label, index) => {
			return { label: label, value: data.datasets[0].data[index] };
		});

		// Sortowanie kombinowanych danych na podstawie wartości
		combinedData.sort((a, b) => b.value - a.value);

		// Aktualizacja danych i etykiet na wykresie
		data.labels = combinedData.map((item) => item.label);
		data.datasets[0].data = combinedData.map((item) => item.value);
	}
	const colors = [
		'rgba(255, 134,159,0.4)',
		'rgba(255, 206, 86, 0.4)',
		'rgba(75, 192, 192, 0.4)',
		'rgba(153, 102, 255, 0.4)',
		'rgba(255, 159, 64, 0.4)',
		'rgba(54, 162, 235, 0.4)',
		'rgba(98,  182, 239,0.4)',
		'rgba(255, 218, 128,0.4)',
		'rgba(113, 205, 205,0.4)',
		'rgba(170, 128, 252,0.4)',
		'rgba(255, 177, 101,0.4)'
	];

	// Przypisujemy kolory do każdego zestawu danych
	if (data && data.datasets && data.datasets.length > 0) {
		data.datasets[0].backgroundColor = colors;
	}
</script>

<Bar {data} options={{ responsive: true, indexAxis: 'x' }} />
