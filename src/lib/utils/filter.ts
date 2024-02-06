export const isNumber = (value: unknown): value is number => typeof value === 'number';
export const textPrefixFilter = ({ filterValue, value }) => {
	return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
};

export const minFilter = ({ filterValue, value }) => {
	if (typeof value !== 'number' || typeof filterValue !== 'number') return true;
	return filterValue <= value;
};

export const numberRangeFilter = ({ filterValue, value }) => {
	if (!Array.isArray(filterValue) || typeof value !== 'number') return true;
	const [min, max] = filterValue;
	if (min === null && max === null) return true;
	if (min === null) return value <= max;
	if (max === null) return min <= value;

	return min <= value && value <= max;
};

export const districtFilter = ({ filterValue, value }) => {
	if (filterValue.length === 0) return true;
	if (!Array.isArray(filterValue) || typeof value !== 'string') return true;
	return filterValue.some((filter) => {
		return value.includes(filter);
	});
};

export const propertyTypeFilter = ({ filterValue, value }) => {
	if (filterValue.length === 0) return false;
	if (!Array.isArray(filterValue) || typeof value !== 'string') return true;
	return filterValue.some((filter) => {
		return value.includes(filter);
	});
};

export const matchFilter = ({ filterValue, value }) => {
	if (filterValue === undefined) return true;
	return filterValue === value;
};

export const booleanFilter = ({ filterValue, value }) => {
	if (value === undefined) return value;
	if (filterValue === false) return value
		else return true;
};