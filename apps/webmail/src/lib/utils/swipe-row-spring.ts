/** Damped spring for swipe row snap-back (motion-sv–style release physics). */
export function animateSpringScalar(
	from: number,
	to: number,
	options: {
		stiffness?: number;
		damping?: number;
		mass?: number;
		onUpdate: (value: number) => void;
		onComplete?: () => void;
	}
): () => void {
	const stiffness = options.stiffness ?? 420;
	const damping = options.damping ?? 32;
	const mass = options.mass ?? 1;
	let value = from;
	let velocity = 0;
	let last = performance.now();
	let frame = 0;

	const step = (now: number) => {
		const dt = Math.min((now - last) / 1000, 0.032);
		last = now;
		const displacement = value - to;
		const acceleration = (-stiffness * displacement - damping * velocity) / mass;
		velocity += acceleration * dt;
		value += velocity * dt;
		options.onUpdate(value);

		if (Math.abs(displacement) < 0.35 && Math.abs(velocity) < 0.04) {
			options.onUpdate(to);
			options.onComplete?.();
			return;
		}

		frame = requestAnimationFrame(step);
	};

	frame = requestAnimationFrame(step);
	return () => cancelAnimationFrame(frame);
}
