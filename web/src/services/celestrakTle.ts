import { getFallbackTleEntries } from './celestrakFallback';

export interface TleEntry {
    name: string;
    line1: string;
    line2: string;
}
export async function fetchCelestrakTLEs(_group: string): Promise<TleEntry[]> {
    return getFallbackTleEntries();
}