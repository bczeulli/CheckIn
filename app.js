(function () {
    console.log("🚀 Script app.js inicializado com sucesso!");

    const SUPABASE_URL = 'https://trautmdfnnqrcpxgvjdj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_rO3ePQkXA5SDLal_2AJWQQ_b9hFJP51';

    try {
        window.supabaseClient = window.supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
        console.error("❌ Erro ao criar cliente Supabase:", err);
    }
    const supabase = window.supabaseClient;

    let usuarioAtual = null;

    document.addEventListener('DOMContentLoaded', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        const avisoLogin = document.getElementById('aviso-login-necessario');
        const conteudoProtegido = document.getElementById('conteudo-protegido');
        const headerAction = document.getElementById('auth-header-action');

        if (!session) {
            avisoLogin.classList.remove('hidden');
            conteudoProtegido.classList.add('hidden');
            headerAction.innerHTML = `
                <a href="login.html" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm">
                    Entrar / Login
                </a>
            `;
            return;
        }

        usuarioAtual = session.user;
        document.getElementById('email-atleta-logado').textContent = `Conta: ${usuarioAtual.email}`;

        avisoLogin.classList.add('hidden');
        conteudoProtegido.classList.remove('hidden');

        // Carrega o nome salvo na tabela perfis, se houver
        const { data: perfil } = await supabase
            .from('perfis')
            .select('*')
            .eq('id', usuarioAtual.id)
            .maybeSingle();

        if (perfil && perfil.nome) {
            document.getElementById('input-nome-atleta').value = perfil.nome;
        }

        // Configura botão de salvar nome direto abaixo do header
        document.getElementById('btn-salvar-nome').addEventListener('click', async () => {
            await salvarNomeAtleta();
        });

        // Verifica se é admin para exibir o botão no header
        let adminBtnHtml = '';
        if (perfil && perfil.is_admin) {
            adminBtnHtml = `
                <a href="admin.html" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-3.5 py-2.5 rounded-xl transition-colors">
                    ⚙️ Painel Admin
                </a>
            `;
        }

        headerAction.innerHTML = `
            <div class="flex items-center gap-2">
                ${adminBtnHtml}
                <button onclick="fazerLogoutIndex()" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer">
                    Sair
                </button>
            </div>
        `;

        carregarAulas();
    });

    async function salvarNomeAtleta() {
        const nomeInput = document.getElementById('input-nome-atleta');
        const nome = nomeInput.value.trim();

        if (!nome) {
            alert('Por favor, digite um nome válido!');
            nomeInput.focus();
            return;
        }

        try {
            // Atualiza ou insere na tabela perfis
            const { error: erroPerfil } = await supabase
                .from('perfis')
                .update({ nome: nome })
                .eq('id', usuarioAtual.id);

            if (erroPerfil) throw erroPerfil;

            // Sincroniza também na tabela alunos
            const { data: alunoExistente } = await supabase
                .from('alunos')
                .select('id')
                .eq('id', usuarioAtual.id)
                .maybeSingle();

            if (!alunoExistente) {
                await supabase.from('alunos').insert([{ id: usuarioAtual.id, nome: nome }]);
            } else {
                await supabase.from('alunos').update({ nome: nome }).eq('id', usuarioAtual.id);
            }

            alert('Nome salvo com sucesso!');
            carregarAulas();
        } catch (error) {
            console.error('Erro ao salvar nome:', error.message);
            alert('Não foi possível salvar o nome.');
        }
    }

    async function carregarAulas() {
        const container = document.getElementById('lista-aulas');
        
        const { data: aulas, error } = await supabase
            .from('aulas')
            .select(`
                *,
                checkins (
                    id,
                    status,
                    modalidade,
                    realizado_em,
                    aluno_id,
                    alunos (
                        id,
                        nome
                    )
                )
            `)
            .order('data_hora', { ascending: true });

        if (error) {
            console.error('❌ Erro ao buscar aulas:', error);
            container.innerHTML = `<p class="text-red-400 text-center py-8">Erro ao carregar as aulas.</p>`;
            return;
        }

        if (!aulas || aulas.length === 0) {
            container.innerHTML = `<p class="text-slate-500 text-center py-8">Nenhuma aula cadastrada no momento.</p>`;
            return;
        }

        container.innerHTML = '';

        for (const aula of aulas) {
            const dataFormatada = new Date(aula.data_hora).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short'
            });

            const checkins = aula.checkins || [];
            const confirmados = checkins.filter(c => c.status === 'confirmado');
            const emEspera = checkins.filter(c => c.status === 'espera');
            
            const totalConfirmados = confirmados.length;
            const vagasRestantes = aula.limite_alunos - totalConfirmados;
            const estaLotado = vagasRestantes <= 0;

            const meuCheckin = checkins.find(c => c.aluno_id === usuarioAtual.id);
            const jaInscrito = !!meuCheckin;

            // Renderiza nomes confirmados
            let htmlConfirmados = '';
            if (totalConfirmados > 0) {
                const badges = confirmados.map(c => {
                    const eVoce = c.aluno_id === usuarioAtual.id;
                    const modStr = c.modalidade ? ` (${c.modalidade})` : '';
                    return `
                        <span class="${eVoce ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'} border text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full ${eVoce ? 'bg-indigo-400' : 'bg-emerald-400'}"></span>
                            ${c.alunos ? c.alunos.nome : 'Atleta'}${modStr} ${eVoce ? '(Você)' : ''}
                        </span>
                    `;
                }).join('');
                htmlConfirmados = `<div class="flex flex-wrap gap-2 mt-2">${badges}</div>`;
            } else {
                htmlConfirmados = `<p class="text-xs text-slate-500 italic mt-1">Nenhum atleta confirmado ainda.</p>`;
            }

            // Renderiza lista de espera
            let htmlEspera = '';
            if (emEspera.length > 0) {
                const badgesEspera = emEspera.map((c, index) => {
                    const eVoce = c.aluno_id === usuarioAtual.id;
                    const modStr = c.modalidade ? ` (${c.modalidade})` : '';
                    return `
                        <span class="${eVoce ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-bold' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'} border text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                            <span class="text-[10px] bg-amber-500/20 px-1 rounded">#${index + 1}</span>
                            ${c.alunos ? c.alunos.nome : 'Atleta'}${modStr} ${eVoce ? '(Você)' : ''}
                        </span>
                    `;
                }).join('');
                htmlEspera = `
                    <div class="mt-4 pt-3 border-t border-slate-700/60">
                        <p class="text-xs font-semibold text-amber-400/90 mb-2 flex items-center gap-1.5">⏳ Lista de Espera (${emEspera.length}):</p>
                        <div class="flex flex-wrap gap-2">${badgesEspera}</div>
                    </div>
                `;
            }

            // Área de Ação do Card (Picklist + Botão)
            let acaoHtml = '';
            if (jaInscrito) {
                acaoHtml = `
                    <button id="btn-${aula.id}" class="w-full sm:w-auto font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30">
                        Desmarcar Aula
                    </button>
                `;
            } else {
                acaoHtml = `
                    <div class="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                        <select id="modalidade-${aula.id}" class="w-full sm:w-auto bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="" disabled selected>Modalidade</option>
                            <option value="TotalPass">TotalPass</option>
                            <option value="WellHub">Wellhub</option>
                            <option value="Mensal">Mensal</option>
                        </select>
                        <button id="btn-${aula.id}" class="w-full sm:w-auto font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer text-sm ${estaLotado ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'}">
                            ${estaLotado ? 'Entrar na Lista de Espera' : 'Marcar Aula'}
                        </button>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4 transition-all hover:border-slate-600';
            
            card.innerHTML = `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <h3 class="font-bold text-lg text-white">${aula.nome}</h3>
                            ${estaLotado ? '<span class="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Lotado</span>' : ''}
                        </div>
                        <p class="text-sm text-slate-400">Professor(a): <span class="text-slate-200 font-medium">${aula.professor}</span></p>
                        <div class="flex items-center gap-3 text-xs text-slate-400 pt-1">
                            <span>📅 ${dataFormatada}</span>
                            <span>•</span>
                            <span class="${estaLotado ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}">
                                ${estaLotado ? `Vagas esgotadas (${totalConfirmados}/${aula.limite_alunos})` : `${vagasRestantes} vagas restantes`}
                            </span>
                        </div>
                    </div>
                    ${acaoHtml}
                </div>
                
                <div class="mt-2 pt-3 border-t border-slate-700/60">
                    <p class="text-xs font-semibold text-slate-400 mb-1">Atletas Confirmados (${totalConfirmados}/${aula.limite_alunos}):</p>
                    ${htmlConfirmados}
                </div>
                ${htmlEspera}
            `;
            
            container.appendChild(card);

            document.getElementById(`btn-${aula.id}`).addEventListener('click', () => {
                if (jaInscrito) {
                    desmarcarAula(meuCheckin.id, aula.id, meuCheckin.status);
                } else {
                    const nomeAtual = document.getElementById('input-nome-atleta').value.trim();
                    if (!nomeAtual) {
                        alert('Por favor, defina seu nome no campo logo abaixo do cabeçalho antes de marcar a aula!');
                        document.getElementById('input-nome-atleta').focus();
                        return;
                    }

                    const selectModalidade = document.getElementById(`modalidade-${aula.id}`);
                    const modalidadeEscolhida = selectModalidade.value;

                    if (!modalidadeEscolhida) {
                        alert('Por favor, selecione a modalidade (TotalPass, Wellhub ou Mensal) antes de marcar a aula!');
                        selectModalidade.focus();
                        return;
                    }

                    marcarAula(aula.id, aula.limite_alunos, modalidadeEscolhida, nomeAtual);
                }
            });
        }
    }

    async function marcarAula(aulaId, limiteAlunos, modalidade, nomeAtleta) {
        try {
            // Garante que o nome está atualizado na tabela alunos antes de prosseguir
            await supabase.from('alunos').upsert([{ id: usuarioAtual.id, nome: nomeAtleta }]);

            const { count: totalConfirmados, error: erroCount } = await supabase
                .from('checkins')
                .select('*', { count: 'exact', head: true })
                .eq('aula_id', aulaId)
                .eq('status', 'confirmado');

            if (erroCount) throw erroCount;

            const statusCheckin = totalConfirmados >= limiteAlunos ? 'espera' : 'confirmado';

            const { error: erroInsereCheckin } = await supabase
                .from('checkins')
                .insert([{ 
                    aula_id: aulaId, 
                    aluno_id: usuarioAtual.id, 
                    status: statusCheckin,
                    modalidade: modalidade
                }]);

            if (erroInsereCheckin) throw erroInsereCheckin;

            if (statusCheckin === 'confirmado') {
                alert(`Aula marcada com sucesso usando ${modalidade}! Vaga garantida 🏐`);
            } else {
                alert(`Aula lotada! Você foi adicionado à Lista de Espera ⏳ usando ${modalidade}.`);
            }

            carregarAulas();
        } catch (error) {
            console.error('Erro ao marcar aula:', error.message);
            alert('Não foi possível marcar a aula. Tente novamente.');
        }
    }

    async function desmarcarAula(checkinId, aulaId, statusAnterior) {
        if (!confirm('Deseja realmente desmarcar sua presença nesta aula?')) return;

        try {
            const { error: erroDelete } = await supabase
                .from('checkins')
                .delete()
                .eq('id', checkinId);

            if (erroDelete) throw erroDelete;

            if (statusAnterior === 'confirmado') {
                const { data: proximoEspera } = await supabase
                    .from('checkins')
                    .select('id, aluno_id')
                    .eq('aula_id', aulaId)
                    .eq('status', 'espera')
                    .order('realizado_em', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (proximoEspera) {
                    await supabase
                        .from('checkins')
                        .update({ status: 'confirmado' })
                        .eq('id', proximoEspera.id);
                }
            }

            alert('Aula desmarcada com sucesso!');
            carregarAulas();
        } catch (error) {
            console.error('Erro ao desmarcar aula:', error.message);
            alert('Não foi possível desmarcar a aula.');
        }
    }

    window.fazerLogoutIndex = async function() {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    };
})();