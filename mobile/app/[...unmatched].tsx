import { Redirect, usePathname } from 'expo-router';
import { useEffect } from 'react';

export default function Unmatched() {
    const pathname = usePathname();
    useEffect(() => {
        console.warn('ROUTER_UNMATCHED: Tried to navigate to non-existent route:', pathname);
    }, [pathname]);

    return <Redirect href="/(tabs)/" />;
}
