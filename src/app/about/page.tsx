const timeline = [
  { period: '20대', title: '연주로 시작한 음악', description: '무대와 연습실에서 음악의 언어를 익히며, 소리를 듣고 함께 호흡하는 시간을 쌓았습니다.' },
  { period: '긴 공백', title: '음악을 다시 바라본 시간', description: '음악에서 멀어진 시간 속에서도, 삶의 경험은 언젠가 다시 꺼내 쓸 수 있는 이야기로 남았습니다.' },
  { period: '새로운 시작', title: 'AI 음악 제작과의 만남', description: '새로운 도구를 통해 음악을 만드는 과정에 다시 가까워지고, 가능성을 탐색하기 시작했습니다.' },
  { period: '현재', title: '직접 작곡하며 기록하는 중', description: '곡과 작곡 일기를 함께 쌓으며, 한 사람의 음악 세계를 차분히 만들어가고 있습니다.' },
];

export default function AboutPage() {
  return (
    <main className="bg-[#f8f5ed]">
      <section className="border-b border-stone-200 bg-[#f1ede3] py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:gap-16 lg:px-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">ABOUT THE ARTIST</p>
            <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">KIM GYUNG HOON</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              음악이 만들어지는 과정과 그 안에 머문 시간을 기록하는 작곡가입니다.
            </p>
          </div>
          <div className="flex aspect-[4/5] items-end border border-stone-300 bg-stone-800 p-6 text-stone-100">
            <p className="font-serif text-2xl leading-snug">Music is a record of listening.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="biography-heading" className="py-18 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">PROFILE &amp; BIOGRAPHY</p>
          <div className="max-w-3xl">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl" id="biography-heading">
              오래 듣고, 천천히 만듭니다.
            </h2>
            <div className="mt-7 space-y-5 leading-8 text-stone-600">
              <p>김경훈은 연주에서 출발해 다시 작곡으로 돌아온 음악가입니다. 소리의 결을 듣고, 그 안에 남아 있는 감정을 음악으로 옮기는 일에 관심을 둡니다.</p>
              <p>이 아카이브는 완성된 곡뿐 아니라 그 곡에 이르기까지의 질문과 배움을 함께 기록합니다. 한 곡을 만드는 시간과 그 과정에서 발견한 감각을 나누고자 합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="timeline-heading" className="border-y border-stone-200 bg-[#fffdf8] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">CREATIVE JOURNEY</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl" id="timeline-heading">Timeline</h2>
          <ol className="mt-10 border-l border-amber-800/40 pl-6 sm:pl-10">
            {timeline.map((item) => (
              <li className="relative pb-10 last:pb-0" key={item.title}>
                <span className="absolute -left-[1.95rem] top-1 size-3 rounded-full border-2 border-[#fffdf8] bg-amber-800 sm:-left-[2.7rem]" />
                <p className="text-xs font-semibold tracking-[0.18em] text-amber-900">{item.period}</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                <p className="mt-3 max-w-2xl leading-7 text-stone-600">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="philosophy-heading" className="bg-stone-950 py-18 text-stone-100 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">PHILOSOPHY</p>
          <div className="max-w-3xl">
            <h2 className="font-serif text-3xl font-semibold leading-snug tracking-tight sm:text-4xl" id="philosophy-heading">
              음악은 완성된 결과보다, 그곳에 이르기까지 귀 기울인 시간에 더 가까이 있습니다.
            </h2>
            <p className="mt-7 leading-8 text-stone-300">
              좋은 음악은 정답을 서두르지 않고 충분히 듣는 데서 시작된다고 믿습니다. 작은 화음 하나와 잠시의 침묵까지 소중히 다루며, 오래 남는 음악을 만들고자 합니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
