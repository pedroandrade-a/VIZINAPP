// Gerenciamento de Banco de Dados Local (localStorage)
const DB = {
    getUsuarios() {
        return JSON.parse(localStorage.getItem('vizinapp_usuarios')) || [];
    },
    salvarUsuario(usuario) {
        const usuarios = this.getUsuarios();
        usuarios.push(usuario);
        localStorage.setItem('vizinapp_usuarios', JSON.stringify(usuarios));
    },
    buscarUsuario(identificador) {
        return this.getUsuarios().find(u => 
            u.email === identificador || 
            u.username === identificador || 
            u.cpf === identificador
        );
    },
    getSolicitacoes() {
        return JSON.parse(localStorage.getItem('vizinapp_solicitacoes')) || [];
    },
    salvarSolicitacao(solicitacao) {
        const solicitacoes = this.getSolicitacoes();
        solicitacoes.push(solicitacao);
        localStorage.setItem('vizinapp_solicitacoes', JSON.stringify(solicitacoes));
    },
    gerarId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    },
    formatarData(dataIso) {
        const data = new Date(dataIso);
        return data.toLocaleDateString('pt-BR');
    }
};

// Classe Principal da Aplicação (Dashboard + Sistema)
class VizinApp {
    constructor() {
        this.currentUser = null;
        this.db = DB;
        this.init();
    }

    init() {
        this.createDemoAccount();
        this.setupEventListeners();
        this.checkLoggedInUser();
        this.loadSolicitacoes();
    }

    setupEventListeners() {
        // Alternância de Telas no Dashboard (Login / Cadastro)
        document.getElementById('linkParaCadastro')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarSecao('registerSection');
        });

        document.getElementById('linkParaLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarSecao('loginSection');
        });

        // Entrada como Morador Não Associado
        document.getElementById('btnModoVisitante')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.entrarComoVisitante();
        });

        // Submissão dos Formulários do Dashboard
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));

        // Ações da Página de Solicitações
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('novaSolicitacaoForm')?.addEventListener('submit', (e) => this.handleNovaSolicitacao(e));
        
        const btnNovaSolici = document.getElementById('btnNovaSolicitacaoHeader');
        if (btnNovaSolici) {
            btnNovaSolici.addEventListener('click', (e) => {
                e.preventDefault();
                const secao = document.getElementById('novaSolicitacao');

                if (secao) {
                    if (secao.style.display === 'none' || secao.style.display === '') {
                        secao.style.display = 'block';
                        secao.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        secao.style.display = 'none';
                    }
                }
            });
        }
    }

    // Navegação Interna do Dashboard
    mostrarSecao(secaoId) {
        this.limparMensagem();
        document.getElementById('loginSection')?.classList.add('hidden');
        document.getElementById('registerSection')?.classList.add('hidden');
        document.getElementById(secaoId)?.classList.remove('hidden');
    }

    mostrarMensagem(texto, tipo) {
        const messageBox = document.getElementById('message-box');
        if (!messageBox) return;
        messageBox.textContent = texto;
        messageBox.className = tipo === 'sucesso' ? 'msg-success' : 'msg-error';
        messageBox.style.display = 'block';
    }

    limparMensagem() {
        const messageBox = document.getElementById('message-box');
        if (messageBox) messageBox.style.display = 'none';
    }

    // Conta de Demonstração Inicial (US08)
    createDemoAccount() {
        const demoUser = {
            id: 'demo-admin',
            nome: 'Administrador da Associação',
            cpf: '000.000.000-00',
            endereco: 'Centro de Maricá',
            username: 'admin',
            email: 'admin@marica.gov.br',
            senha: '12345',
            isAssociado: true,
            dataCadastro: new Date().toISOString()
        };

        const adminExistente = this.db.buscarUsuario('admin');

        if (!adminExistente || adminExistente.isAssociado === undefined) {
            let usuarios = this.db.getUsuarios().filter(u => u.username !== 'admin');
            localStorage.setItem('vizinapp_usuarios', JSON.stringify(usuarios));
            this.db.salvarUsuario(demoUser);
            this.createDemoSolicitations();
        }
    }

    // Solicitações de Exemplo
    createDemoSolicitations() {
        if (this.db.getSolicitacoes().length > 0) return;

        const demoRequests = [
            {
                id: this.db.gerarId(),
                usuarioEmail: 'admin@marica.gov.br',
                isAnonimo: false,
                secretaria: 'Infraestrutura',
                titulo: 'Reparo de Calçada',
                localizacao: 'Rua Domício da Gama, Centro',
                descricao: 'Calçada danificada em trecho de grande circulação.',
                prioridade: 'Normal',
                status: 'Em Andamento',
                dataCriacao: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                protocolo: 'VZ-' + Date.now().toString().slice(-6)
            },
            {
                id: this.db.gerarId(),
                usuarioEmail: null,
                isAnonimo: true,
                secretaria: 'Iluminação Pública',
                titulo: 'Lâmpada Queimada',
                localizacao: 'Av. Roberto Silveira, Flamengo',
                descricao: 'Solicitação anônima: poste sem iluminação noturna.',
                prioridade: 'Alta',
                status: 'Pendente',
                dataCriacao: new Date().toISOString(),
                protocolo: 'VZ-ANON-' + Date.now().toString().slice(-4)
            }
        ];

        demoRequests.forEach(req => this.db.salvarSolicitacao(req));
    }

    // Autenticação de Login do Associado (US03)
    handleLogin(e) {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username')?.value.trim();
        const passwordInput = document.getElementById('password')?.value.trim();

        if (!usernameInput || !passwordInput) {
            this.mostrarMensagem('Preencha todos os campos!', 'erro');
            return;
        }

        const usuario = this.db.buscarUsuario(usernameInput);

        if (usuario && usuario.senha === passwordInput) {
            this.login(usuario);
            this.mostrarMensagem('Login realizado com sucesso! Redirecionando...', 'sucesso');

            setTimeout(() => {
                window.location.href = 'solicitacoes.html';
            }, 1000);
        } else {
            this.mostrarMensagem('Usuário ou senha incorretos!', 'erro');
        }
    }

    // Cadastro de Integrante da Associação (US01)
    handleRegister(e) {
        e.preventDefault();
        const nome = document.getElementById('regNome')?.value.trim();
        const cpf = document.getElementById('regCpf')?.value.trim();
        const endereco = document.getElementById('regEndereco')?.value.trim();
        const email = document.getElementById('regEmail')?.value.trim();
        const senha = document.getElementById('regPassword')?.value.trim();

        if (this.db.buscarUsuario(email) || this.db.buscarUsuario(cpf)) {
            this.mostrarMensagem('E-mail ou CPF já cadastrado!', 'erro');
            return;
        }

        const novoUsuario = {
            id: this.db.gerarId(),
            nome: nome,
            cpf: cpf,
            endereco: endereco,
            username: email,
            email: email,
            senha: senha,
            isAssociado: true,
            dataCadastro: new Date().toISOString()
        };

        this.db.salvarUsuario(novoUsuario);
        this.login(novoUsuario);
        this.mostrarMensagem('Cadastro concluído! Redirecionando...', 'sucesso');
        
        setTimeout(() => {
            window.location.href = 'solicitacoes.html';
        }, 1000);
    }

    // Entrada do Morador Não Associado (US06)
    entrarComoVisitante() {
        localStorage.removeItem('vizinapp_current_user');
        window.location.href = 'solicitacoes.html';
    }

    // Criação de Solicitação (US04 & US05)
    handleNovaSolicitacao(e) {
        e.preventDefault();

        if (!this.currentUser || !this.currentUser.isAssociado) {
            alert('Apenas moradores associados podem criar solicitações. Faça login ou cadastre-se.');
            return;
        }

        const isAnonimo = document.getElementById('isAnonimo')?.checked || false;
        
        const solicitacao = {
            id: this.db.gerarId(),
            usuarioEmail: isAnonimo ? null : (this.currentUser?.email || 'Anônimo'),
            isAnonimo: isAnonimo,
            secretaria: document.getElementById('secretaria')?.value,
            titulo: document.getElementById('titulo')?.value,
            localizacao: document.getElementById('localizacao')?.value,
            descricao: document.getElementById('descricao')?.value,
            prioridade: document.getElementById('prioridade')?.value,
            status: 'Pendente',
            dataCriacao: new Date().toISOString(),
            protocolo: isAnonimo ? 'VZ-ANON-' + Date.now().toString().slice(-4) : 'VZ-' + Date.now().toString().slice(-6)
        };

        this.db.salvarSolicitacao(solicitacao);
        alert(`Solicitação gerada! Protocolo: ${solicitacao.protocolo}`);
        e.target.reset();
        this.loadSolicitacoes();
    }

    // Exibição de Solicitações na Tela (US06 & US07)
    loadSolicitacoes() {
        const container = document.getElementById('solicitacoesList');
        if (!container) return;

        const solicitacoes = this.db.getSolicitacoes();
        
        if (solicitacoes.length === 0) {
            container.innerHTML = '<div class="empty-message"><h3>Nenhuma solicitação encontrada.</h3></div>';
            return;
        }

        container.innerHTML = solicitacoes.map(sol => {
            const statusClass = sol.status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            return `
                <article class="solicitacao-card">
                    <header class="solicitacao-card-header">
                        <div>
                            <span class="protocolo">${sol.protocolo}</span>
                            <h3>${sol.titulo} ${sol.isAnonimo ? '<small>(Anônima)</small>' : ''}</h3>
                        </div>
                        <span class="status status-${statusClass}">${sol.status}</span>
                    </header>
                    <div class="solicitacao-card-body">
                        <p><strong>Secretaria:</strong> ${sol.secretaria}</p>
                        <p><strong>Local:</strong> ${sol.localizacao || 'Não informado'}</p>
                        <p><strong>Prioridade:</strong> ${sol.prioridade || 'Normal'}</p>
                        <p class="descricao">${sol.descricao}</p>
                    </div>
                    <footer class="solicitacao-card-footer">
                        <span>Data de registro: ${this.db.formatarData(sol.dataCriacao)}</span>
                        <span>Enviado por: ${sol.isAnonimo ? 'Anônimo' : (sol.usuarioEmail || 'Associado')}</span>
                    </footer>
                </article>
            `;
        }).join('');
    }

    login(usuario) {
        this.currentUser = usuario;
        localStorage.setItem('vizinapp_current_user', JSON.stringify(usuario));
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('vizinapp_current_user');
        window.location.href = 'dashboard.html';
    }

    checkLoggedInUser() {
        const savedUser = localStorage.getItem('vizinapp_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
        this.aplicarRegrasDeAcesso();
    }

    aplicarRegrasDeAcesso() {
        const secaoNovaSolicitacao = document.getElementById('novaSolicitacao');
        const btnNovaSolicitacaoHeader = document.getElementById('btnNovaSolicitacaoHeader');
        const painelPerfil = document.getElementById('perfilUsuario');
        const btnLogout = document.getElementById('logoutBtn');

        // Se NÃO for associado (Morador não associado / Visitante)
        if (!this.currentUser || !this.currentUser.isAssociado) {
            if (secaoNovaSolicitacao) secaoNovaSolicitacao.style.display = 'none';
            if (btnNovaSolicitacaoHeader) btnNovaSolicitacaoHeader.style.display = 'none';
            if (painelPerfil) painelPerfil.style.display = 'none';
            if (btnLogout) btnLogout.textContent = 'Voltar ao Login';
        } else {
            // Se for Morador Associado
            if (secaoNovaSolicitacao) secaoNovaSolicitacao.style.display = 'none';
            if (btnNovaSolicitacaoHeader) btnNovaSolicitacaoHeader.style.display = 'inline-flex';
            if (painelPerfil) {
                painelPerfil.style.display = 'block';
                painelPerfil.innerHTML = `
                    <div class="association-info-content">
                        <div>
                            <span class="info-label">ASSOCIADO / NOME</span>
                            <strong>${this.currentUser.nome}</strong>
                        </div>
                        <div>
                            <span class="info-label">CPF</span>
                            <strong>${this.currentUser.cpf}</strong>
                        </div>
                        <div>
                            <span class="info-label">BAIRRO / ENDEREÇO</span>
                            <strong>${this.currentUser.endereco}</strong>
                        </div>
                        <div>
                            <span class="info-label">E-MAIL (LOGIN)</span>
                            <strong>${this.currentUser.email}</strong>
                        </div>
                    </div>
                `;
            }
            if (btnLogout) btnLogout.textContent = 'Sair';
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VizinApp();
});