import type { User } from '#lib/types';

declare global {
	namespace App {
		interface Locals {
			/** The signed-in Zaur account, from the session cookie. */
			user: User | null;
		}
	}
}

export {};
