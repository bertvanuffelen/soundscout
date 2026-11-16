import { describe, it, expect, beforeEach } from 'vitest';
import { applyRouteToStore } from '../screenSync';
import { useAppStore } from '../../stores/appStore';

describe('applyRouteToStore (router → appStore)', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentScreen: 'start', currentLocationId: null, shareCode: null,
      sharedPraatplaatCode: null, sharedAlbumCode: null, pendingSaveCode: null, pendingAssignment: null,
    });
  });

  it('zet het scherm van de route in de store', () => {
    applyRouteToStore('tutorial', {});
    expect(useAppStore.getState().currentScreen).toBe('tutorial');
  });

  it('neemt locatie-id en deelcodes uit het pad over', () => {
    applyRouteToStore('location', { locationId: 'park' });
    expect(useAppStore.getState()).toMatchObject({ currentScreen: 'location', currentLocationId: 'park' });

    applyRouteToStore('shared', { code: 'AB12CD34' });
    expect(useAppStore.getState()).toMatchObject({ currentScreen: 'shared', shareCode: 'AB12CD34' });

    applyRouteToStore('shared-album', { code: 'ALBUM001' });
    expect(useAppStore.getState()).toMatchObject({ currentScreen: 'shared-album', sharedAlbumCode: 'ALBUM001' });

    applyRouteToStore('shared-praatplaat', { code: 'PP000001' });
    expect(useAppStore.getState()).toMatchObject({ currentScreen: 'shared-praatplaat', sharedPraatplaatCode: 'PP000001' });
  });

  it('Terug naar start ruimt op zoals goToStart (deelcode weg)', () => {
    applyRouteToStore('shared', { code: 'AB12CD34' });
    applyRouteToStore('start', {});
    expect(useAppStore.getState()).toMatchObject({ currentScreen: 'start', shareCode: null });
  });

  it('Terug loopt stap voor stap: podium → studio → kaart → start', () => {
    useAppStore.getState().goToStage();
    applyRouteToStore('studio', {});
    expect(useAppStore.getState().currentScreen).toBe('studio');
    applyRouteToStore('map', {});
    expect(useAppStore.getState()).toMatchObject({ currentScreen: 'map', currentLocationId: null });
    applyRouteToStore('start', {});
    expect(useAppStore.getState().currentScreen).toBe('start');
  });

  it('laat de store met rust als die al klopt (geen opruimwerk bij een eigen goTo)', () => {
    useAppStore.getState().goToStartWith('code');
    applyRouteToStore('start', {});
    // goToStart() zou niets aan pendingStartAction doen, maar de aanroep mag
    // er niet eens komen: de toestand is al gelijk aan de route.
    expect(useAppStore.getState().pendingStartAction).toBe('code');

    useAppStore.setState({ pendingSaveCode: 'ABC123' });
    useAppStore.getState().goToStudio();
    useAppStore.setState({ pendingSaveCode: 'ABC123' });
    applyRouteToStore('studio', {});
    expect(useAppStore.getState().pendingSaveCode).toBe('ABC123');
  });
});
