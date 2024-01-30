<script>
    import t1 from '$lib/img/t_josh_strowmby.jpg?enhanced&w=600';
    import t2 from '$lib/img/t_3.jpg?enhanced&w=600';
    import t3 from '$lib/img/t_assam_akkadu.jpg?enhanced&w=600';
    import t4 from '$lib/img/t_clint_wayne.jpg?enhanced&w=600';
    import t5 from '$lib/img/t_1.jpg?enhanced&w=600';
    import t6 from '$lib/img/t_10.jpg?enhanced&w=600';
    const people = [
        {
            name: "Taylor Smarton",
            role: "Director Payments & Risk | Pensylvania Zoo",
            quote: "At first I thought it was some kind of strange dinosaur. Then I realised. It's Zaur.",
            img: t1
        },
        {
            name: "Jessica May",
            role: "Manager | Financial Times",
            quote: "Some things are better not talked about at all. Zaur is not like that.",
            img: t2
        },
        {
            name: "Assam Akkadu",
            role: "Farmer",
            quote: "There are few creatures so terrifying and so beautiful at the same time.",
            img: t3
        },
        {
            name: "Clint Wayne",
            role: "Animal Keeper | North Bank",
            quote: "I was shocked to see how effective such a nice animal could be. I would describe it as a mixture of horror and awe.",
            img: t4
        },
        {
            name: "Jack Jarowicki",
            role: "Consultant | Real Estates",
            quote: "I've been in the business for over 20 years. I didn't think there was anything else that could surprise me. As positive as can be.",
            img: t5
        },
        {
            name: "Dominica Lorence",
            role: "CEO | Dominica & Dominica",
            quote: "It's huge.",
            img: t6
        }
]
    </script>
     
    {#each people as person}
    <div class="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">


        <!-- Grid -->
        <div class="md:grid md:grid-cols-2 md:gap-10 lg:gap-16 md:items-center">
          <div class="hidden md:block mb-24 md:mb-0 sm:px-6">
            <div class="relative">
                <enhanced:img class="rounded-xl" src={person.img} alt={person.name} />

      
              <!-- SVG Element -->
              <div class="absolute bottom-0 start-0 -z-[1] translate-y-10 -translate-x-14">
                <svg class="max-w-[10rem] h-auto text-slate-400 dark:text-slate-700" width="696" height="653" viewBox="0 0 696 653" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="72.5" cy="29.5" r="29.5" fill="currentColor"/>
                  <circle cx="171.5" cy="29.5" r="29.5" fill="currentColor"/>
                  <circle cx="270.5" cy="29.5" r="29.5" fill="currentColor"/>
                  <circle cx="369.5" cy="29.5" r="29.5" fill="currentColor"/>
                  <circle cx="468.5" cy="29.5" r="29.5" fill="currentColor"/>
                  <circle cx="567.5" cy="29.5" r="29.5" fill="currentColor"/>
                  <circle cx="666.5" cy="29.5" r="29.5" fill="currentColor"/>
                  <circle cx="29.5" cy="128.5" r="29.5" fill="currentColor"/>
                  <circle cx="128.5" cy="128.5" r="29.5" fill="currentColor"/>
                  <circle cx="227.5" cy="128.5" r="29.5" fill="currentColor"/>
                  <circle cx="326.5" cy="128.5" r="29.5" fill="currentColor"/>
                  <circle cx="425.5" cy="128.5" r="29.5" fill="currentColor"/>
                  <circle cx="524.5" cy="128.5" r="29.5" fill="currentColor"/>
                  <circle cx="623.5" cy="128.5" r="29.5" fill="currentColor"/>
                  <circle cx="72.5" cy="227.5" r="29.5" fill="currentColor"/>
                  <circle cx="171.5" cy="227.5" r="29.5" fill="currentColor"/>
                  <circle cx="270.5" cy="227.5" r="29.5" fill="currentColor"/>
                  <circle cx="369.5" cy="227.5" r="29.5" fill="currentColor"/>
                  <circle cx="468.5" cy="227.5" r="29.5" fill="currentColor"/>
                  <circle cx="567.5" cy="227.5" r="29.5" fill="currentColor"/>
                  <circle cx="666.5" cy="227.5" r="29.5" fill="currentColor"/>
                  <circle cx="29.5" cy="326.5" r="29.5" fill="currentColor"/>
                  <circle cx="128.5" cy="326.5" r="29.5" fill="currentColor"/>
                  <circle cx="227.5" cy="326.5" r="29.5" fill="currentColor"/>
                  <circle cx="326.5" cy="326.5" r="29.5" fill="currentColor"/>
                  <circle cx="425.5" cy="326.5" r="29.5" fill="currentColor"/>
                  <circle cx="524.5" cy="326.5" r="29.5" fill="currentColor"/>
                  <circle cx="623.5" cy="326.5" r="29.5" fill="currentColor"/>
                  <circle cx="72.5" cy="425.5" r="29.5" fill="currentColor"/>
                  <circle cx="171.5" cy="425.5" r="29.5" fill="currentColor"/>
                  <circle cx="270.5" cy="425.5" r="29.5" fill="currentColor"/>
                  <circle cx="369.5" cy="425.5" r="29.5" fill="currentColor"/>
                  <circle cx="468.5" cy="425.5" r="29.5" fill="currentColor"/>
                  <circle cx="567.5" cy="425.5" r="29.5" fill="currentColor"/>
                  <circle cx="666.5" cy="425.5" r="29.5" fill="currentColor"/>
                  <circle cx="29.5" cy="524.5" r="29.5" fill="currentColor"/>
                  <circle cx="128.5" cy="524.5" r="29.5" fill="currentColor"/>
                  <circle cx="227.5" cy="524.5" r="29.5" fill="currentColor"/>
                  <circle cx="326.5" cy="524.5" r="29.5" fill="currentColor"/>
                  <circle cx="425.5" cy="524.5" r="29.5" fill="currentColor"/>
                  <circle cx="524.5" cy="524.5" r="29.5" fill="currentColor"/>
                  <circle cx="623.5" cy="524.5" r="29.5" fill="currentColor"/>
                  <circle cx="72.5" cy="623.5" r="29.5" fill="currentColor"/>
                  <circle cx="171.5" cy="623.5" r="29.5" fill="currentColor"/>
                  <circle cx="270.5" cy="623.5" r="29.5" fill="currentColor"/>
                  <circle cx="369.5" cy="623.5" r="29.5" fill="currentColor"/>
                  <circle cx="468.5" cy="623.5" r="29.5" fill="currentColor"/>
                  <circle cx="567.5" cy="623.5" r="29.5" fill="currentColor"/>
                  <circle cx="666.5" cy="623.5" r="29.5" fill="currentColor"/>
                </svg>
              </div>
              <!-- End SVG Element -->
            </div>
          </div>
          <!-- End Col -->
      
          <div>
            <!-- Blockquote -->
            <blockquote class="relative">
              <svg class="absolute top-0 start-0 transform -translate-x-8 -translate-y-4 h-24 w-24 text-gray-200 dark:text-gray-700" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M7.39762 10.3C7.39762 11.0733 7.14888 11.7 6.6514 12.18C6.15392 12.6333 5.52552 12.86 4.76621 12.86C3.84979 12.86 3.09047 12.5533 2.48825 11.94C1.91222 11.3266 1.62421 10.4467 1.62421 9.29999C1.62421 8.07332 1.96459 6.87332 2.64535 5.69999C3.35231 4.49999 4.33418 3.55332 5.59098 2.85999L6.4943 4.25999C5.81354 4.73999 5.26369 5.27332 4.84476 5.85999C4.45201 6.44666 4.19017 7.12666 4.05926 7.89999C4.29491 7.79332 4.56983 7.73999 4.88403 7.73999C5.61716 7.73999 6.21938 7.97999 6.69067 8.45999C7.16197 8.93999 7.39762 9.55333 7.39762 10.3ZM14.6242 10.3C14.6242 11.0733 14.3755 11.7 13.878 12.18C13.3805 12.6333 12.7521 12.86 11.9928 12.86C11.0764 12.86 10.3171 12.5533 9.71484 11.94C9.13881 11.3266 8.85079 10.4467 8.85079 9.29999C8.85079 8.07332 9.19117 6.87332 9.87194 5.69999C10.5789 4.49999 11.5608 3.55332 12.8176 2.85999L13.7209 4.25999C13.0401 4.73999 12.4903 5.27332 12.0713 5.85999C11.6786 6.44666 11.4168 7.12666 11.2858 7.89999C11.5215 7.79332 11.7964 7.73999 12.1106 7.73999C12.8437 7.73999 13.446 7.97999 13.9173 8.45999C14.3886 8.93999 14.6242 9.55333 14.6242 10.3Z" fill="currentColor"/>
              </svg>
      
              <div class="relative z-10">
                <p class="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-3 dark:text-gray-200">
                  Featured client
                </p>
      
                <p class="text-xl font-medium italic text-gray-800 md:text-2xl md:leading-normal xl:text-3xl xl:leading-normal dark:text-gray-200">
                  {person.quote}
                </p>
              </div>
      
              <footer class="mt-6">
                <div class="flex items-center">
                  <div class="md:hidden flex-shrink-0">
                    <img class="h-12 w-12 rounded-full" src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=320&h=320&q=80" alt="Image Description">
                  </div>
                  <div class="ms-4 md:ms-0">
                    <div class="text-base font-semibold text-gray-800 dark:text-gray-200">{person.name}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{person.role}</div>
                  </div>
                </div>
              </footer>
    
            </blockquote>
            <!-- End Blockquote -->
          </div>
          <!-- End Col -->
        </div>
        <!-- End Grid -->
      </div>
    {/each}
    