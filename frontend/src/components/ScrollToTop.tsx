'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const ScrollToTop = () => {
	const pathname = usePathname();

	useEffect(() => window.document.scrollingElement?.scrollTo(0, 0), [pathname]);

	return null;
};

export default ScrollToTop;
