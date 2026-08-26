<script lang="ts">
	/**
	 * Auth-free layout fixture mirroring production phone chrome:
	 * sticky top bar (back only) + in-flow reader filling the remaining column.
	 * Asserts no top-bar overlap and a single (inline) subject.
	 */
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
</script>

<svelte:head>
	<title>mobile-chrome-lab</title>
</svelte:head>

<div
	class="relative flex h-svh flex-col overflow-hidden bg-surface text-fg"
	data-testid="mobile-chrome-lab"
	style="max-width: 390px; margin-inline: auto; border-inline: 1px solid var(--z-border);"
>
	<main
		id="main-content"
		class="flex min-h-0 flex-1 flex-col overflow-hidden"
		style="padding-top: env(safe-area-inset-top, 0px); padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px);"
	>
		<header class="z-mobile-topbar" data-testid="mobile-topbar">
			<div class="z-mobile-topbar__row">
				<a href="/list-lab" class="z-chrome-icon-btn no-underline" aria-label="Back to list">
					<ArrowLeft class="size-[1.125rem]" aria-hidden="true" />
				</a>
				<!-- Intentionally empty — subject lives once in the reader body. -->
				<div class="min-w-0 flex-1" aria-hidden="true"></div>
			</div>
		</header>

		<div class="z-mail-pane z-mail-pane--mobile-fullscreen" data-testid="fullscreen-reader">
			<article
				class="z-mail-pane-surface z-mail-pane-surface--reader flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
			>
				<div class="z-reader-card flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto z-pane-scroll">
					<section class="z-reader-thread z-reader-thread--expanded">
						<div class="px-4" style="padding-block: var(--z-space-reader-content);">
							<div class="z-reader-chrome__meta">
								<div class="z-reader-chrome__from">
									<p class="z-reader-from break-words" data-testid="reader-from">
										Alexandria Montgomery-Whitfield
									</p>
									<p class="z-reader-meta mt-0.5 truncate" title="alexandria.montgomery@example.com">
										alexandria.montgomery@example.com
									</p>
								</div>
								<time class="z-reader-chrome__time shrink-0 tabular-nums">Yesterday</time>
							</div>

							<h1 class="z-reader-inline-subject" data-testid="reader-subject">
								Quarterly planning notes, budget revisions, and the follow-ups from last
								Thursday’s stakeholder sync
							</h1>

							<div class="z-reader-body mt-4" data-testid="reader-body">
								<p>
									Reader content must start fully below the sticky top bar. The subject is only
									here — never truncated in the chrome.
								</p>
								<p class="mt-4">
									Scroll clearance for the floating action button is covered by
									<code>--z-mobile-chrome-clearance</code> on pane scroll.
								</p>
							</div>
						</div>
					</section>
				</div>
			</article>
		</div>
	</main>
</div>
