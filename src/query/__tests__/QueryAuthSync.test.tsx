/**
 * QueryAuthSync: bij uitloggen of wisselen van docent verdwijnt alles van de
 * vorige docent uit de cache; de rest (andere docent, leerlingdata) blijft.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { createQueryWrapper, createTestQueryClient, type TestAuth } from '../testUtils';
import { queryKeys } from '../queryKeys';

function setup(userId: string | null) {
  const client = createTestQueryClient();
  const auth: TestAuth = { userId };
  const Wrapper = createQueryWrapper(client, auth);
  const view = render(<Wrapper>{null}</Wrapper>);
  const switchTo = (next: string | null) => {
    auth.userId = next;
    view.rerender(<Wrapper>{null}</Wrapper>);
  };
  return { client, switchTo };
}

function seed(client: ReturnType<typeof createTestQueryClient>) {
  client.setQueryData(queryKeys.teacher.classes('a'), { classes: [{ id: 'a1' }] });
  client.setQueryData(queryKeys.teacher.submissions('a', 'c1'), [{ id: 's1', student_name: 'Noor' }]);
  client.setQueryData(queryKeys.teacher.classes('b'), { classes: [{ id: 'b1' }] });
  client.setQueryData(queryKeys.student.liveAssignment('4821'), false);
}

describe('QueryAuthSync', () => {
  it('ruimt de docent op bij uitloggen', () => {
    const { client, switchTo } = setup('a');
    seed(client);

    switchTo(null);

    expect(client.getQueryData(queryKeys.teacher.classes('a'))).toBeUndefined();
    expect(client.getQueryData(queryKeys.teacher.submissions('a', 'c1'))).toBeUndefined();
    expect(client.getQueryData(queryKeys.teacher.classes('b'))).toBeDefined();
    expect(client.getQueryData(queryKeys.student.liveAssignment('4821'))).toBe(false);
  });

  it('ruimt de vorige docent op bij direct wisselen', () => {
    const { client, switchTo } = setup('a');
    seed(client);

    switchTo('b');

    expect(client.getQueryCache().findAll({ queryKey: queryKeys.teacher.user('a') })).toHaveLength(0);
    expect(client.getQueryData(queryKeys.teacher.classes('b'))).toBeDefined();
  });

  it('laat de cache met rust bij inloggen en bij een ververste sessie van dezelfde docent', () => {
    const { client, switchTo } = setup(null);
    seed(client);

    switchTo('a');
    switchTo('a');

    expect(client.getQueryData(queryKeys.teacher.classes('a'))).toBeDefined();
    expect(client.getQueryData(queryKeys.teacher.submissions('a', 'c1'))).toBeDefined();
  });
});
