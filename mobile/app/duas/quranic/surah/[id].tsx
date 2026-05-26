/**
 * Wrapper route that re-uses the canonical Quran reader screen.
 *
 * Why this exists: tapping a surah from /duas/quranic/* needs to land on the
 * reader without jumping into the (tabs) navigator — pushing into a tab route
 * from outside breaks the back stack (back lands on Home instead of Quranic
 * Duas). Mounting the reader under the same stack as the Duas flow keeps
 * router.back() working as expected.
 */
import QuranReader from '../../../(tabs)/quran/[id]';
export default QuranReader;
