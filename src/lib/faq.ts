export type Faq = { q: string; a: string };

// Admin-managed FAQ editing arrives with the admin rebuild; until then these are the defaults.
export const FAQS: Faq[] = [
  {
    q: 'How does Mark Six work?',
    a: 'Mark Six is the Hong Kong Jockey Club lottery. A player chooses 6 different numbers from 1 to 49. In each draw, 6 winning numbers and 1 extra number are drawn. Prizes depend on how many of your numbers match.',
  },
  {
    q: 'What are the seven prize divisions?',
    a: 'First prize needs all 6 winning numbers. Second needs 5 plus the extra number. Third is 5 numbers. Fourth is 4 plus the extra. Fifth is 4 numbers. Sixth is 3 plus the extra. Seventh is 3 numbers. Amounts change every draw and are listed on each result page.',
  },
  {
    q: 'Can I buy tickets or place bets here?',
    a: 'No. Mark Six Hub does not sell tickets, take bets or hold money. Only the Hong Kong Jockey Club can accept Mark Six bets, and only where the law allows it. We publish results and prizes and offer a free number picker.',
  },
  {
    q: 'Is Mark Six Hub affiliated with the Hong Kong Jockey Club?',
    a: 'No. This is an independent information site. It is not affiliated with or endorsed by the Hong Kong Jockey Club. Always confirm results on the official HKJC website before acting on them.',
  },
  {
    q: 'Does the number picker improve my chances?',
    a: 'No. Every combination of 6 numbers has exactly the same chance of being drawn. The picker is a convenience for people who do not want to choose, and it uses secure random numbers.',
  },
  {
    q: 'How are results added to the site?',
    a: 'Our team enters each draw after it is announced. Winning numbers, the extra number and the prize for each division are published together on the result page.',
  },
  {
    q: 'Why do prizes show in other currencies?',
    a: 'Official prizes are in Hong Kong dollars. If you choose another currency, we convert the amounts using indicative rates that we update by hand. They are for information only and are not what a bank would give you.',
  },
];
