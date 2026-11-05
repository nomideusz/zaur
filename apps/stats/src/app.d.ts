import type { User } from '#lib/server/session';

declare global {
	namespace App {
		interface Locals {
			/** The signed-in Zaur account; every page but /auth/* has one. */
			user: User | null;
		}
	}
}

export {};
