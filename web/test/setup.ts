// web/test/setup.ts
import { beforeAll, afterAll } from 'vitest'
import '@testing-library/jest-dom'

// Polyfill for jsdom if needed
beforeAll(() => {
  if (typeof global.document === 'undefined') {
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost',
    })
    global.document = dom.window.document
    global.window = dom.window as any
  }
})

afterAll(() => {
  // Cleanup if needed
})
