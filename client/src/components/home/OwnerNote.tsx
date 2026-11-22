import { fill, site } from '../../lib/content.ts'

/**
 * "From me to you", the burgundy band that closes the homepage: the owner's note in ivory with the A.S. seal (no
 * personal name anywhere on the site), then
 * how a decant reaches you, as three steps joined by a fine line with champagne dots (a row on desktop, a column on
 * phones).
 */
export function OwnerNote() {
  const { note } = site
  return (
    <section
      aria-label={note.kicker}
      className="burgundy reveal mt-14 px-5 pt-12 pb-14 lg:mt-24 lg:px-[120px] lg:pt-[84px] lg:pb-[90px]"
    >
      <p className="text-center text-[13px] tracking-[0.14em] text-[#e8c9cf] uppercase">{note.kicker}</p>
      <blockquote className="mx-auto mt-5 mb-5 max-w-[820px] text-center font-display text-2xl leading-[1.3] text-[#fbf3f4] italic lg:mt-6 lg:text-4xl lg:leading-[1.28]">
        “{note.quote}”
      </blockquote>
      <div className="flex items-center justify-center gap-3 text-[15px] text-[#e8c9cf]">
        {/* The seal reversed to ivory on the burgundy */}
        <img
          src="/seal.svg"
          alt=""
          width={46}
          height={46}
          className="size-10 opacity-90 brightness-0 invert lg:size-[46px]"
        />
        <span>{site.location}</span>
      </div>

      <ol className="relative mx-auto mt-12 grid max-w-[1200px] gap-8 lg:mt-[62px] lg:grid-cols-3 lg:gap-10 lg:text-center">
        {/* The line joining the steps: down the left on phones, across on desktop */}
        <i
          aria-hidden="true"
          className="absolute top-2 bottom-8 left-[7px] w-px bg-gradient-to-b from-white/50 to-white/10 lg:top-[7px] lg:right-[16%] lg:bottom-auto lg:left-[16%] lg:h-px lg:w-auto lg:bg-gradient-to-r lg:from-white/15 lg:via-white/55 lg:to-white/15"
        />
        {note.steps.map((step) => (
          <li key={step.title} className="relative grid grid-cols-[15px_1fr] gap-x-4 lg:block">
            <span
              aria-hidden="true"
              className="mt-1.5 block size-[15px] rounded-full bg-gold shadow-[0_0_0_6px_rgb(226_199_156/0.18)] lg:mx-auto lg:mt-0 lg:mb-[18px]"
            />
            <span>
              <b className="block font-display text-[22px] font-normal lg:text-2xl">{step.title}</b>
              <span className="text-sm whitespace-pre-line text-[#ecd3d8] lg:text-[14.5px]">{fill(step.text)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
