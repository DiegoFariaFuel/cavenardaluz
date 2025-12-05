# cavenardaluz
Modelagem

A modelagem do jogo foi construída usando formas geométricas básicas:

### *2.1 Personagem*

Modelagem hierárquica:


Player
 ├── Body (retângulo principal)
 ├── Head (retângulo menor, posicionado acima)
 └── Lantern (luz dinâmica acoplada)

  Execução Geral do Jogo

O jogo possui os estágios requeridos:

### 1) *Tela Inicial*

* Título do jogo
* Botões de iniciar / ajuda / créditos

### 2) *Fase Jogável*

* movimento do player
* iluminação dinâmica
* coleta
* HUD visível

### 3) *Vitória/Derrota*

* Mensagem central
* Retorno ao menu após 3 segundos
