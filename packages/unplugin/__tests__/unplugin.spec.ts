import { describe, it } from 'vitest'
import { getTransformedSource } from '../../../.tests/viteSpy'
import { resolvePathSync } from 'mlly'
import { mount } from '@vue/test-utils'
import SimpleRender from './fixtures/SimpleRender.vue'

describe('vite plugin transform', () => {
  it('has transformed the code', async ({ expect }) => {
    const path = resolvePathSync('./fixtures/SimpleRender.vue', {
      url: import.meta.url,
    })
    expect(getTransformedSource(path)).toMatchSnapshot()
    expect(mount(SimpleRender).html()).toMatchSnapshot()
  })
})
