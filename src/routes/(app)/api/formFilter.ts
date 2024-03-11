// src/routes/api/formFilter.ts
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { formSchema } from "./schema"; // Upewnij się, że ścieżka do schema.ts jest poprawna

export async function post({ request }) {
    const formData = await request.json();

    // Poprawne użycie superValidate z adapterem zod
    const validation = await superValidate(request, zod(formSchema));

    if (!validation.valid) {
        // Zwrócenie błędu walidacji
        return { 
            status: 400, 
            body: { validation } 
        };
    }

    // Jeśli walidacja przebiegnie pomyślnie
    return { 
        status: 200,
        body: { message: "Formularz przetworzony pomyślnie", formData }
    };
}