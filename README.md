# Neon Sound Trigger

VEXORA SAMPLER — PROMPT COMPLETO PARA DESENVOLVIMENTO

1. Objetivo do projeto

Desenvolva um aplicativo profissional de disparo de áudio para computadores Windows chamado VEXORA SAMPLER, inspirado nas funcionalidades de samplers de áudio como Soundplant e em painéis profissionais de DJs.

O aplicativo deve transformar o teclado completo do computador em um painel de disparo de sons, permitindo associar arquivos de áudio a teclas físicas e reproduzi-los instantaneamente, inclusive enquanto outros programas estão abertos.

A identidade visual deve combinar uma interface moderna com a estética dos antigos programas de DJ, usando fundo preto, detalhes neon, medidores de áudio, animações luminosas e um papel de parede totalmente personalizável pelo usuário.

O resultado deve ser um programa realmente funcional, não apenas uma demonstração visual.

2. Plataforma e arquitetura

Desenvolver inicialmente a interface e o gerenciamento no Lovable, utilizando tecnologias web modernas, componentes reutilizáveis e TypeScript.

Preparar a arquitetura para distribuição como aplicativo desktop para Windows, preferencialmente utilizando Tauri com um componente nativo de áudio e captura de teclado. Electron também poderá ser considerado caso facilite a implementação das funcionalidades necessárias.

Utilizar:

- React e TypeScript para a interface.
- Tailwind CSS para a estilização.
- Uma biblioteca de áudio adequada à reprodução simultânea e ao controle de áudio.
- Um mecanismo de áudio desktop de baixa latência, integrado ao Windows.
- Armazenamento local persistente para configurações, projetos, bancos e preferências.
- Banco de dados local, como SQLite, quando apropriado.
- Um sistema de importação e gerenciamento de arquivos locais.

Não depender de conexão permanente com a internet para tocar arquivos de áudio locais.

Não implementar atalhos globais, importação de pastas ou controles de áudio apenas visualmente. Cada recurso deve ser conectado à sua implementação real.

3. Identidade visual

Criar uma interface profissional de software de DJ, com:

- Fundo predominantemente preto.
- Detalhes verdes, azuis, cianos, vermelhos e laranjas em neon.
- Botões grandes com bordas luminosas.
- Animações suaves de LED.
- Medidores estéreo de áudio.
- Barras de progresso.
- Visualização da forma de onda.
- Controles inspirados em equipamentos de áudio profissionais.
- Tipografia legível e moderna.
- Ícones intuitivos.
- Janela redimensionável, com layout adaptável a diferentes resoluções de monitores.

Criar uma barra superior com o nome VEXORA SAMPLER, os controles da janela e os acessos às configurações.

O design deve priorizar rapidez, legibilidade e facilidade de operação ao vivo.

4. Papel de parede personalizado

Criar um sistema de personalização visual que permita ao usuário escolher suas próprias imagens.

Funcionalidades:

- Importar imagens JPG, JPEG, PNG e WEBP do computador.
- Selecionar uma imagem para o cabeçalho ou para o fundo completo do aplicativo.
- Oferecer os modos preencher, ajustar, centralizar e ampliar.
- Permitir alterar o posicionamento da imagem.
- Permitir escurecer o fundo para preservar a leitura dos controles.
- Ajustar a transparência dos elementos sobre a imagem quando apropriado.
- Permitir restaurar o fundo padrão.
- Guardar a preferência permanentemente.
- Reabrir o aplicativo com a imagem escolhida anteriormente.
- Não perder o papel de parede ao reiniciar o computador ou atualizar o aplicativo.

O sistema deve copiar ou registrar corretamente os arquivos selecionados para que a imagem continue disponível depois de fechar o programa. Tratar arquivos removidos, movidos ou indisponíveis com mensagens claras.

5. Painel principal de disparo de áudio

Criar uma área central composta por pads de áudio organizados de maneira semelhante a um teclado ou painel de sampler.

Cada pad deve exibir:

- Tecla associada.
- Nome do áudio.
- Duração.
- Estado da reprodução.
- Cor personalizada.
- Indicador visual de atividade.

Permitir:

- Carregar áudio em qualquer pad.
- Substituir o áudio de um pad.
- Renomear o pad.
- Alterar sua cor.
- Alterar seu tamanho quando o layout permitir.
- Reorganizar os pads.
- Remover ou limpar uma associação.
- Configurar individualmente o comportamento de reprodução.

O painel deve permitir navegar pelo teclado completo sem exigir que todas as teclas apareçam simultaneamente em uma tela pequena.

6. Teclado completo do computador

Esta é uma das funções mais importantes do projeto.

Criar uma representação visual interativa de um teclado de PC, com layout compatível com ABNT2 brasileiro e suporte a outros layouts quando possível.

Incluir as seguintes categorias:

Letras: A a Z.

Números superiores: 0 a 9.

Teclas de função: F1 a F12.

Teclado numérico: números de 0 a 9, operadores matemáticos, Enter e demais teclas presentes no dispositivo.

Teclas de navegação: setas, Home, End, Page Up, Page Down, Insert e Delete.

Teclas de controle: Espaço, Enter, Escape, Tab, Backspace, Caps Lock e outras teclas compatíveis.

Teclas modificadoras: Shift, Ctrl, Alt, teclas Windows e outras teclas reconhecidas pelo sistema.

Pontuação e símbolos: teclas de pontuação, acentos e símbolos presentes no layout físico selecionado.

Detectar o layout de teclado quando possível e permitir selecionar manualmente o padrão ABNT2 ou outro layout compatível.

Não presumir que todos os teclados possuem as mesmas teclas físicas. Mostrar apenas as teclas aplicáveis ao layout escolhido.

Associação de sons

Permitir que o usuário:

- Selecione uma tecla visual.
- Escolha um arquivo de áudio.
- Defina o comportamento da reprodução.
- Configure cor, brilho e animação.
- Salve a associação.
- Substitua ou remova a associação a qualquer momento.

Exemplo de configuração:

- A: vinheta de abertura.
- B: efeito sonoro.
- C: chamada comercial.
- 1: música de fundo.
- F1: locução.
- F2: efeito de transição.
- Teclado numérico 1: outro efeito independente.

Esses exemplos são apenas demonstrações; o usuário deve poder configurar qualquer tecla compatível.

Captura de teclado

Implementar duas modalidades:

1. Captura de teclado quando o aplicativo estiver em primeiro plano.
2. Atalhos globais do Windows para disparar áudios mesmo quando o aplicativo estiver minimizado ou outro programa estiver ativo.

A captura global deve utilizar um componente desktop nativo adequado. Não afirmar que atalhos globais estão funcionando se o aplicativo estiver executando apenas no navegador.

Criar proteção contra disparos acidentais quando o usuário estiver digitando em campos de texto, configurando arquivos ou utilizando menus.

Permitir configurar quais teclas ficam reservadas para controles do sistema.

Respeitar limitações do Windows para teclas protegidas, combinações especiais e atalhos do sistema operacional.

7. Efeitos LED sincronizados com os áudios

Criar um sistema de iluminação visual sincronizado com o estado real de reprodução.

Quando o usuário pressionar uma tecla:

- O áudio associado começa a tocar.
- O pad correspondente acende imediatamente.
- A borda ganha um brilho neon.
- O botão pode apresentar uma animação pulsante.
- Um indicador de reprodução aparece no pad.
- Ao finalizar o áudio, o pad retorna ao estado normal, respeitando a configuração selecionada.

Permitir escolher:

- Cor do LED por tecla.
- Intensidade do brilho.
- Velocidade da animação.
- Efeito contínuo.
- Efeito pulsante.
- Efeito de borda luminosa.
- Efeito de ativação rápida.
- Cor de repouso e cor de reprodução.

A iluminação deve refletir o estado verdadeiro do mecanismo de áudio. Não utilizar apenas temporizadores visuais independentes.

Se dois ou mais sons estiverem tocando, os respectivos pads devem permanecer iluminados de maneira independente.

Se um som for interrompido pelo usuário, seu LED deve apagar imediatamente.

Oferecer uma opção para desativar as animações e reduzir o consumo de recursos.

8. Reprodução de áudio

Implementar um mecanismo de áudio real, com controles funcionais.

Recursos:

- Play.
- Pause.
- Resume.
- Stop.
- Reiniciar áudio.
- Controle de volume individual.
- Volume master.
- Reprodução simultânea de vários arquivos.
- Reprodução em loop.
- Quantidade máxima configurável de sons simultâneos.
- Fade-in.
- Fade-out.
- Interrupção imediata.
- Controle de início da reprodução.
- Medidores de nível estéreo.
- Tempo decorrido.
- Duração total.
- Barra de progresso.
- Visualização de waveform quando disponível.

Oferecer configurações individuais por pad:

- Tocar uma vez.
- Repetir continuamente.
- Parar quando a mesma tecla for pressionada novamente.
- Reiniciar quando a mesma tecla for pressionada novamente.
- Permitir sobreposição do mesmo áudio, se suportado.
- Interromper outros sons de um grupo definido pelo usuário.

Criar uma função de Stop Geral que interrompa todas as reproduções iniciadas pelo aplicativo.

O Pause deve suspender a reprodução sem apagar as associações dos pads. O Stop deve encerrar a reprodução conforme o comportamento configurado.

9. Formatos de arquivo

Suportar, conforme as bibliotecas e codecs disponíveis:

- WAV.
- MP3.
- OGG.
- FLAC.
- Outros formatos compatíveis com o mecanismo de áudio adotado.

Validar cada arquivo antes de adicioná-lo.

Exibir mensagens de erro claras para arquivos inválidos, corrompidos ou incompatíveis.

Não modificar nem excluir os arquivos originais do usuário.

10. Biblioteca de áudios e pastas

Criar uma biblioteca local para organizar arquivos de áudio.

Permitir:

- Importar arquivos individuais.
- Selecionar pastas do computador.
- Navegar pelas pastas autorizadas.
- Exibir nome, formato, duração e localização.
- Pesquisar áudios pelo nome.
- Filtrar por formato.
- Pré-escutar arquivos.
- Arrastar arquivos da biblioteca para os pads.
- Substituir arquivos mantendo a tecla associada.
- Identificar arquivos ausentes.
- Atualizar a biblioteca quando solicitado.

Implementar acesso a pastas por meio dos recursos de arquivo do aplicativo desktop.

Não afirmar que uma pasta permanece sincronizada automaticamente se a funcionalidade de monitoramento de alterações não estiver implementada.

11. Bancos de áudio

Criar inicialmente três bancos:

- Banco A.
- Banco B.
- Banco C.

Permitir adicionar, renomear, duplicar, exportar e remover bancos.

Cada banco deve guardar:

- Associações de teclas.
- Caminhos dos arquivos.
- Cores dos pads.
- Configurações de reprodução.
- Volumes individuais.
- Configurações de loop.
- Layout visual.
- Preferências relacionadas aos LEDs.

A troca de banco deve ser rápida e não pode interromper sons que já estejam tocando, a menos que o usuário escolha esse comportamento.

Permitir configurar um atalho para trocar de banco.

12. Controles master

Criar um painel lateral contendo:

- Volume master.
- Indicador de áudio ativo.
- Medidores esquerdo e direito.
- Play.
- Pause.
- Stop.
- Stop Geral.
- Mudo.
- Indicador de reprodução atual.
- Controle de bancos.
- Acesso à biblioteca.
- Acesso às configurações.
- Configuração de atalhos.

Os controles devem ser acessíveis pelo mouse e, quando configurado, pelo teclado.

13. Organização e personalização do painel

Permitir que o usuário:

- Altere a ordem dos pads.
- Escolha o tamanho dos pads.
- Organize o painel em linhas e colunas.
- Personalize cores.
- Oculte áreas que não utiliza.
- Escolha o painel de teclado completo ou uma grade de pads.
- Salve diferentes layouts.
- Restaure o layout padrão.

Garantir que a interface continue utilizável em resoluções diferentes, sem sobreposição dos controles.

14. Projetos e salvamento automático

Criar um sistema de projetos locais.

Cada projeto deve preservar:

- Nome.
- Bancos.
- Associações de teclas.
- Configurações dos pads.
- Papel de parede.
- Cores e LEDs.
- Layout do painel.
- Volumes e comportamentos de reprodução.
- Referências aos arquivos utilizados.

Salvar automaticamente as alterações importantes.

Permitir salvar cópias de segurança e recuperar projetos anteriores.

Criar um formato de projeto próprio, documentado e validado, que possa armazenar as configurações e referências aos arquivos.

Não incluir automaticamente arquivos de áudio pesados em uma exportação de projeto. Oferecer uma opção explícita para empacotar os arquivos quando necessário e permitido.

15. Configurações avançadas

Criar uma tela com:

- Dispositivo de saída de áudio.
- Taxa de amostragem quando suportada.
- Tamanho do buffer quando suportado.
- Preferência de latência.
- Limite de sons simultâneos.
- Atalhos globais.
- Layout de teclado.
- Configurações de inicialização.
- Aparência.
- Papel de parede.
- Backup.
- Idioma português do Brasil.

Exibir somente configurações que o mecanismo realmente consiga aplicar.

16. Estabilidade e desempenho

O programa será utilizado para disparar áudio ao vivo. Portanto:

- Priorizar baixa latência.
- Evitar atrasos desnecessários entre a tecla e o início do áudio.
- Evitar travamentos quando vários sons estiverem tocando.
- Não bloquear a interface durante a importação de arquivos.
- Gerenciar corretamente o encerramento das reproduções.
- Liberar recursos de áudio quando não forem mais necessários.
- Tratar falhas de dispositivos de saída.
- Validar caminhos de arquivos.
- Evitar duplicação de eventos de teclado.
- Não permitir que uma tecla presa mantenha um áudio ou LED ativo indevidamente.

Não prometer latência específica sem medições reais.

17. Segurança e privacidade

O aplicativo deve operar localmente sempre que possível.

Solicitar acesso aos arquivos somente quando necessário.

Não enviar áudios, imagens ou projetos para servidores sem autorização explícita.

Não implementar telemetria invasiva.

Validar arquivos de projetos antes de carregá-los e impedir que caminhos inválidos sejam utilizados.

18. Distribuição para Windows

Preparar uma versão desktop instalável.

A entrega final deve contemplar:

- Instalador para Windows compatível com a arquitetura selecionada.
- Ícone original do VEXORA SAMPLER.
- Inicialização pelo menu Iniciar.
- Persistência das configurações entre sessões.
- Acesso aos arquivos locais.
- Captura de atalhos globais implementada e testada.
- Reprodução simultânea de áudio.
- Tratamento de erros.
- Desinstalação adequada.

Se a construção do instalador não puder ser realizada diretamente pelo Lovable, fornecer a configuração, os arquivos-fonte e as instruções de compilação necessárias em um ambiente compatível.

19. Plano de implementação

Desenvolver em etapas verificáveis.

Etapa 1 — Interface: construir a janela principal, o papel de parede personalizado, o painel de pads, o teclado completo, os bancos e os controles visuais.

Etapa 2 — Áudio: implementar importação, reprodução, pausa, stop, volume, loop, reprodução simultânea e indicadores de estado.

Etapa 3 — Teclado: implementar associações de todas as teclas compatíveis, captura em primeiro plano e atalhos globais do Windows.

Etapa 4 — LEDs: sincronizar cores e animações com a reprodução real dos sons.

Etapa 5 — Persistência: implementar salvamento de projetos, bancos, papel de parede e configurações.

Etapa 6 — Desktop: integrar os recursos nativos, gerar a versão instalável e testar em Windows.

Etapa 7 — Testes: verificar arquivos de áudio, teclas, combinações, múltiplos sons, troca de bancos, retomada após reinicialização e estabilidade.

Não substituir funcionalidades complexas por botões demonstrativos.

20. Critérios obrigatórios de conclusão

O projeto só deve ser considerado funcional quando:

1. O usuário conseguir importar e reproduzir arquivos reais.
2. As teclas associadas dispararem os sons corretamente.
3. O teclado completo compatível puder ser configurado.
4. Os atalhos globais funcionarem na versão desktop, inclusive com outro programa em primeiro plano.
5. Os LEDs refletirem a reprodução real.
6. Vários sons puderem tocar simultaneamente.
7. O usuário conseguir selecionar seu próprio papel de parede.
8. Os bancos e projetos forem salvos e recuperados corretamente.
9. O Stop Geral interromper todas as reproduções iniciadas pelo programa.
10. A aplicação desktop puder ser instalada e executada em um computador Windows compatível.

Comece construindo a interface e a arquitetura do projeto. Antes de implementar cada etapa, verifique se as dependências e integrações são viáveis. Informe claramente quais recursos estão implementados, quais ainda estão pendentes e quais exigem compilação desktop.

Resultado esperado: um sampler profissional para Windows, com identidade visual própria, teclado completo, reprodução rápida de áudio, LEDs animados, papel de parede personalizável e recursos adequados para uso em rádio web, locução, DJs e aparelhagens.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://neon-sound-trigger.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8dabdda-eef0-45a8-9873-3192b5d499d0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
