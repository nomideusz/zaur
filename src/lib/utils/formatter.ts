const currency = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
export const formatter = (value) => currency.format(value);
export const squareMeterFormatter = (value) => {
    if (value == null) {
        return ''; // lub zwróć jakiś domyślny tekst, np. 'n/a'
    }

    return `${value.toLocaleString('pl-PL')} m²`;
};