/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from "ava";
import fs from "mz/fs";
import path from "path";
import providers from "../../src/background/providers";

test("Provider Styles", async (t) => {
    const styles = await fs.readFile(path.join(__dirname, '../../src/list/list.css'));

    for(const provider in providers) {
        t.true(styles.includes(`.tabcontent > ul > .${provider}`), `Color definitions for ${provider} exist`);
    }
});
