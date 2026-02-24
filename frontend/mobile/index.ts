/** Ponto de bootstrap mobile para o runtime Expo. */

import { registerRootComponent } from 'expo';

import App from './App';

// Registra o componente raiz do app no Expo.
// Isso garante que a aplicacao funcione tanto no Expo Go quanto em build nativa.
registerRootComponent(App);
