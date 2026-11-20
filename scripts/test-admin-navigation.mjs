import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { adminItems } from '../lib/admin-nav.ts';
import { adminIcons } from '../lib/admin-icons.ts';

// The authenticated shell renders ALL menu icons on every admin route.
// A missing component must fail here, before publication.
for (const item of adminItems) {
  const markup = renderToStaticMarkup(createElement(adminIcons[item.slug], { size: 19 }));
  assert.match(markup, /<svg/, `Missing renderable icon for ${item.slug}`);
}
assert.equal(Object.keys(adminIcons).length, adminItems.length);
console.log(`Admin navigation: ${adminItems.length} section icons render successfully.`);
