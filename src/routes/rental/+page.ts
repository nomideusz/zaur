export async function load({ fetch }) {
	const ads = await (await fetch("api/rent")).json();
	return { ads };
}