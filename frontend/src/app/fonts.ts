import { Exo, Space_Grotesk, Space_Mono } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
	subsets: ['latin'],
	variable: '--font-space-grotesk',
});

const exo = Exo({ subsets: ['latin'], variable: '--font-exo' });

const spaceMono = Space_Mono({
	subsets: ['latin'],
	variable: '--font-space-mono',
	weight: '400',
});

export { exo, spaceGrotesk, spaceMono };
