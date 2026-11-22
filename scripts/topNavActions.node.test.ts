import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TOP_NAV_SUBMIT_ACTIONS,
  formatUnreadBadge,
  resolveRoleHubLink,
} from '../src/shared/components/topNavActions'

test('TOP_NAV_SUBMIT_ACTIONS retains all 5 core submission destinations', () => {
  assert.equal(TOP_NAV_SUBMIT_ACTIONS.length, 5)
  const hrefs = TOP_NAV_SUBMIT_ACTIONS.map(a => a.href)
  assert.deepEqual(hrefs, [
    '/submit-listing',
    '/submit-listing?type=venue',
    '/submit-listing?type=opportunity',
    '/submit-listing?type=coach',
    '/khelchronicle/submit',
  ])
  assert.ok(TOP_NAV_SUBMIT_ACTIONS.some(a => a.className.includes('header-action-coach')))
  assert.ok(TOP_NAV_SUBMIT_ACTIONS.some(a => a.className.includes('header-action-chronicle')))
})

test('resolveRoleHubLink returns Coach Hub for coaches and Academy Hub for academies/visitors', () => {
  const coach = resolveRoleHubLink('coach', '/coach-dashboard')
  assert.equal(coach.href, '/coach-dashboard')
  assert.equal(coach.label, 'Coach Hub')
  assert.equal(coach.isActive, true)

  const academy = resolveRoleHubLink('academy', '/academy-hub')
  assert.equal(academy.href, '/academy-hub')
  assert.equal(academy.label, 'Academy Hub')
  assert.equal(academy.isActive, true)

  const visitor = resolveRoleHubLink(null, '/play')
  assert.equal(visitor.href, '/academy-hub')
  assert.equal(visitor.label, 'Academy Hub')
  assert.equal(visitor.isActive, false)
})

test('formatUnreadBadge caps counts above 9 and hides zero/negative counts', () => {
  assert.equal(formatUnreadBadge(0), null)
  assert.equal(formatUnreadBadge(-2), null)
  assert.equal(formatUnreadBadge(3), '3')
  assert.equal(formatUnreadBadge(9), '9')
  assert.equal(formatUnreadBadge(14), '9+')
})
