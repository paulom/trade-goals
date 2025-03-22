// Constantes
const STORAGE_PREFIX = 'trade_goals_';
const APP_VERSION = 'v2.0.1-noCache'; // Versão atualizada com edição de valores inteiros

// Limpa cache se a versão mudar
(function() {
  const lastVersion = localStorage.getItem('app_version');
  // Forçar limpeza de cache
  const forceCleanCache = true; 
  
  if (lastVersion !== APP_VERSION || forceCleanCache) {
    console.log('Forçando limpeza de cache...');
    
    // Limpa cache e localStorage
    if (caches && caches.keys) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log('Limpando cache:', name);
          caches.delete(name);
        });
      });
    }
    
    // Armazena nova versão
    localStorage.setItem('app_version', APP_VERSION);
    console.log('Cache limpo: nova versão detectada', APP_VERSION);
  }
})();

// Formata um valor para moeda brasileira
function formatarMoeda(valor) {
  try {
    // Se for string, converte para número
    if (typeof valor === 'string') {
      valor = valor.replace(/\D/g, '');
      valor = parseFloat(valor) / 100;
    }
    
    // Garante que é um número válido
    if (typeof valor !== 'number' || isNaN(valor)) {
      valor = 0;
    }
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  } catch (error) {
    console.error('Erro ao formatar moeda:', error);
    return 'R$ 0,00';
  }
}

// Extrai um número de uma string formatada como moeda
function extrairNumero(valor) {
  try {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    
    valor = valor.toString().replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(valor) || 0;
  } catch (error) {
    console.error('Erro ao extrair número:', error);
    return 0;
  }
}

// Aplica máscara de moeda a um campo de entrada
function aplicarMascaraMoeda(campo) {
  if (!campo) return;
  
  campo.addEventListener('input', function() {
    try {
      let valor = this.value;
      if (!valor) return;
      
      // Adiciona classe quando está digitando
      this.classList.add('digitando');
      
      // Remove tudo que não for número
      valor = valor.replace(/\D/g, '');
      
      // Durante a digitação, não divide por 100 (não trata como centavos)
      if (valor) {
        // Formata como número inteiro
        this.value = valor;
      }
    } catch (error) {
      console.error('Erro ao aplicar máscara:', error);
    }
  });
  
  campo.addEventListener('focus', function() {
    try {
      // Adiciona classe quando o campo recebe foco
      this.classList.add('digitando');
      
      let valor = this.value;
      if (valor === 'R$ 0,00') {
        this.value = '';
      } else {
        // Remove formatação de moeda e deixa apenas o número inteiro
        valor = extrairNumero(valor);
        // Converte para inteiro (remove casas decimais)
        valor = Math.round(valor);
        this.value = valor.toString();
        
        // Seleciona todo o texto para facilitar edição
        this.selectionStart = 0;
        this.selectionEnd = this.value.length;
      }
    } catch (error) {
      console.error('Erro ao focar campo:', error);
    }
  });
  
  campo.addEventListener('blur', function() {
    try {
      // Remove classe quando perde o foco
      this.classList.remove('digitando');
      
      if (!this.value || this.value === '0') {
        this.value = 'R$ 0,00';
      } else {
        // Ao perder o foco, formata como moeda
        let valor = parseInt(this.value, 10);
        this.value = formatarMoeda(valor);
      }
    } catch (error) {
      console.error('Erro ao perder foco:', error);
      this.value = 'R$ 0,00';
    }
  });
}

// Classe principal
class TradeGoals {
  constructor() {
    this.inicializar();
  }
  
  // Certifique-se de que a função formatarMoeda seja acessível
  formatarMoeda = formatarMoeda;
  extrairNumero = extrairNumero;
  
  inicializar() {
    // Elementos do DOM
    this.capitalInput = document.getElementById('capital');
    this.metaInput = document.getElementById('meta');
    this.diasInput = document.getElementById('dias');
    this.gerarBtn = document.getElementById('gerarTabela');
    this.exportarBtn = document.getElementById('exportarExcel');
    this.tabela = document.getElementById('tabela');
    this.tbody = this.tabela.querySelector('tbody');
    
    // Valor inicial do capital
    if (this.capitalInput) {
      this.capitalInput.value = this.formatarMoeda(1000);
      aplicarMascaraMoeda(this.capitalInput);
    }
    
    // Eventos
    if (this.gerarBtn) {
      this.gerarBtn.addEventListener('click', () => this.gerarTabela());
    }
    
    if (this.exportarBtn) {
      this.exportarBtn.addEventListener('click', () => this.exportarExcel());
    }
    
    // Observer para os campos de ganhos reais
    this.configurarObservador();
    
    // Service Worker
    this.registrarServiceWorker();
  }
  
  gerarTabela() {
    try {
      // Valores dos inputs
      const capital = this.extrairNumero(this.capitalInput.value);
      const meta = parseFloat(this.metaInput.value) / 100;
      const dias = parseInt(this.diasInput.value);
      
      // Validação
      if (isNaN(capital) || isNaN(meta) || isNaN(dias) || dias <= 0) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
      }
      
      // Limpa tabela
      this.tbody.innerHTML = '';
      
      // Gera linhas
      let valorAtual = capital;
      for (let dia = 1; dia <= dias; dia++) {
        const ganhoMeta = valorAtual * meta;
        const ganhoSalvo = localStorage.getItem(`${STORAGE_PREFIX}ganho_${dia}`);
        const ganhoReal = ganhoSalvo ? parseFloat(ganhoSalvo) : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${dia}</td>
          <td>${this.formatarMoeda(valorAtual)}</td>
          <td>${this.formatarMoeda(ganhoMeta)}</td>
          <td><input type="text" class="ganhos-reais" value="${this.formatarMoeda(ganhoReal)}" data-linha="${dia}" data-capital="${valorAtual}" data-tipo="inteiro"></td>
          <td class="capital-atualizado">${this.formatarMoeda(valorAtual + ganhoReal)}</td>
        `;
        
        this.tbody.appendChild(tr);
        valorAtual += ganhoMeta;
      }
    } catch (error) {
      console.error('Erro ao gerar tabela:', error);
      alert('Ocorreu um erro ao gerar a tabela.');
    }
  }
  
  atualizarCapital(input) {
    try {
      const capital = parseFloat(input.dataset.capital);
      const linha = input.dataset.linha;
      const valor = this.extrairNumero(input.value);
      
      // Atualiza o capital na tabela
      const tdCapital = input.parentElement.nextElementSibling;
      tdCapital.textContent = this.formatarMoeda(capital + valor);
      
      // Salva no localStorage
      localStorage.setItem(`${STORAGE_PREFIX}ganho_${linha}`, valor);
    } catch (error) {
      console.error('Erro ao atualizar capital:', error);
    }
  }
  
  exportarExcel() {
    try {
      // Gera CSV
      let csv = '';
      for (let row of this.tabela.rows) {
        const rowData = Array.from(row.cells).map(cell => {
          // Pega apenas o texto, não os inputs
          const text = cell.innerText.replace(/\n/g, '');
          return `"${text}"`;
        });
        csv += rowData.join(',') + '\n';
      }
      
      // Cria blob e link de download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'trade_goals.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  }
  
  configurarObservador() {
    const self = this; // Referência para usar dentro do observer
    
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          const camposGanhos = document.querySelectorAll('input.ganhos-reais:not([data-mascara])');
          camposGanhos.forEach(campo => {
            aplicarMascaraMoeda(campo);
            campo.setAttribute('data-mascara', 'true');
            
            // Adiciona evento para atualizar o capital
            campo.addEventListener('input', () => {
              self.atualizarCapital(campo);
            });
          });
        }
      });
    });
    
    const tabela = document.querySelector('#tabela tbody');
    if (tabela) {
      observer.observe(tabela, { childList: true, subtree: true });
    }
  }
  
  registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .catch(error => {
            console.error('Erro ao registrar Service Worker:', error);
          });
      });
    }
  }
}

// Limpar aplicação anterior 
if (window.app) {
  delete window.app;
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.app = new TradeGoals();
  } catch (error) {
    console.error('Erro na inicialização do aplicativo:', error);
  }
});