export async function load({ fetch }) {
    const ads = await (await fetch("./")).json();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const selectedDistricts = [
        'Azory', 'Bielany', 'Bieńczyce', 'Bieżanów-Prokocim', 'Borek Fałęcki', 'Bronowice',
        'Czyżyny', 'Dywizjonu 303', 'Dąbie', 'Dębniki', 'Grzegórzki', 'Górka Narodowa',
        'Hutnicze', 'Jagiellońskie', 'Kazimierz', 'Kleparz', 'Kliny Zacisze', 'Kolorowe',
        'Krowodrza', 'Krowodrza Górka', 'Kurdwanów', 'Ludwinów', 'Mistrzejowice', 'Mydlniki',
        'Na Kozłówce', 'Nowa Huta', 'Oficerskie', 'Olsza', 'Podgórze', 'Podgórze Duchackie',
        'Prokocim', 'Prądnik Biały', 'Prądnik Czerwony', 'Pychowice', 'Płaszów', 'Ruczaj',
        'Salwator', 'Stare Miasto', 'Stare Podgórze', 'Szkolne', 'Wesoła', 'Wola Duchacka',
        'Wola Justowska', 'Wzgórza Krzesławickie', 'Zabłocie', 'Zwierzyniec', 'Złocień',
        'Łagiewniki-Borek Fałęcki', 'Śródmieście', 'Żabiniec'
    ];

    const dataByDistrict = selectedDistricts.reduce((acc, district) => {
        acc[district] = { currentMonth: [], previousMonth: [] };
        return acc;
    }, {});

    ads.forEach(ad => {
        const adDate = new Date(ad.date);
        const adMonth = adDate.getMonth();
        const adYear = adDate.getFullYear();

        if (ad.price_per_sqm > 0 && selectedDistricts.includes(ad.district)) {
            if (adMonth === currentMonth && adYear === currentYear) {
                dataByDistrict[ad.district].currentMonth.push(ad.price_per_sqm);
            } else if ((adMonth === currentMonth - 1 || (currentMonth === 0 && adMonth === 11)) && adYear === (currentMonth === 0 ? currentYear - 1 : currentYear)) {
                dataByDistrict[ad.district].previousMonth.push(ad.price_per_sqm);
            }
        }
    });

const districtData = Object.entries(dataByDistrict).map(([district, { currentMonth, previousMonth }]) => {
    const averageCurrent = currentMonth.length ? calculateAverage(trimOutliers(currentMonth)) : null;
    const averagePrevious = previousMonth.length ? calculateAverage(trimOutliers(previousMonth)) : null;
    const totalAds = currentMonth.length + previousMonth.length;

    return { district, averageCurrent, averagePrevious, totalAds };
}).filter(data => data.totalAds >= 5);

districtData.sort((a, b) => b.averageCurrent - a.averageCurrent);

const labels = districtData.map(data => `${data.district} (${data.totalAds})`);
const dataCurrentMonth = districtData.map(data => data.averageCurrent);
const dataPreviousMonth = districtData.map(data => data.averagePrevious);
    
    // Przygotowanie danych do wykresu z nowymi etykietami
    const chartData = {
        labels,
        datasets: [
            {
                label: 'Poprzedni miesiąc',
                data: dataPreviousMonth,
                borderWidth: 2,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
            },
            {
                label: 'Bieżący miesiąc',
                data: dataCurrentMonth,
                borderWidth: 2,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
            },
        ],
    };

    return { props: { chartData } };
}

function trimOutliers(prices) {
    prices.sort((a, b) => a - b);
    const lowerBound = Math.floor(prices.length * 0.05);
    const upperBound = Math.ceil(prices.length * 0.95);
    return prices.slice(lowerBound, upperBound);
}


function calculateAverage(prices) {
    if (!prices.length) return null;
    const total = prices.reduce((sum, price) => sum + price, 0);
    return parseFloat((total / prices.length).toFixed(2));
}