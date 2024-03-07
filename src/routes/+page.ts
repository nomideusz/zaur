export async function load({ fetch }) {
    const ads = await (await fetch("./")).json();
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
    const filteredAds = ads.filter(ad => ad.price_per_sqm > 0 && selectedDistricts.includes(ad.district));

    // Grupowanie ogłoszeń według dzielnicy
    const groupedByDistrict = filteredAds.reduce((acc, ad) => {
        if (!acc[ad.district]) {
            acc[ad.district] = { ads: [], count: 0 };
        }
        acc[ad.district].ads.push(ad);
        acc[ad.district].count++;
        return acc;
    }, {});

    const filteredByMinAds = Object.entries(groupedByDistrict).reduce((acc, [district, {ads, count}]) => {
        if (count >= 10) {
            acc[district] = { ads, count };
        }
        return acc;
    }, {});

    // Obliczanie średniej ceny za metr kwadratowy dla każdej dzielnicy
    const labels = [];
    const data = [];
    Object.entries(filteredByMinAds).forEach(([district, {ads, count}]) => {
        const sortedPrices = ads.map(ad => ad.price_per_sqm).sort((a, b) => a - b);
        const cutOff = Math.floor(sortedPrices.length * 0.05); // 5% skrajnych wartości
        const filteredPrices = sortedPrices.slice(cutOff, sortedPrices.length - cutOff);
        const averagePrice = filteredPrices.reduce((acc, price) => acc + price, 0) / filteredPrices.length;

        labels.push(`${district} (${count})`);
        data.push(parseFloat(averagePrice.toFixed(2)));
    });

    // Przygotowanie danych do wykresu
    const chartData = {
        labels: labels,
        datasets: [
            {
                data: data,
                borderWidth: 2,
            },
        ],
    };

    return { props: { chartData } };
}
