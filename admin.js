(function () {
    console.log("⚙️ Script admin.js completo e atualizado carregado!");

    const SUPABASE_URL = 'https://trautmdfnnqrcpxgvjdj.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_rO3ePQkXA5SDLal_2AJWQQ_b9hFJP51';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    document.addEventListener('DOMContentLoaded', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        const { data: perfil, error: erroPerfil } = await supabase
            .from('perfis')
            .select('is_admin')
            .eq('id', session.user.id)
            .maybeSingle();

        if (erroPerfil || !perfil || !perfil.is_admin) {
            alert('Acesso negado! Esta área é exclusiva para administradores.');
            window.location.href = 'index.html';
            return;
        }

        console.log("👤 Admin validado via banco de dados.");

        inicializarCriacaoEmMassa();
        carregarAulasAdmin();
    });

    // Retorna a data atual no formato DD/MM/AAAA
    function obterDataAtualFormatada() {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }

    // Configura a criação em massa de aulas (com data atual e limite 8 padrão)
    function inicializarCriacaoEmMassa() {
        const container = document.getElementById('container-cards-aulas');
        const btnAdicionar = document.getElementById('btn-adicionar-card-aula');
        const formMassa = document.getElementById('form-aulas-massa');

        if (!container || !btnAdicionar || !formMassa) return;

        // Preenche o card padrão inicial
        const dataInputInicial = container.querySelector('input[name="data"]');
        const limiteInputInicial = container.querySelector('input[name="limite"]');
        if (dataInputInicial) dataInputInicial.value = obterDataAtualFormatada();
        if (limiteInputInicial) limiteInputInicial.value = '8';

        // Botão para adicionar mais cards sem limite de quantidade
        btnAdicionar.addEventListener('click', () => {
            const novoCard = document.createElement('div');
            novoCard.className = 'card-aula-massa bg-slate-900/80 border border-slate-700/80 p-4 rounded-xl relative space-y-3';
            novoCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Nova Aula</span>
                    <button type="button" class="btn-remover-card text-red-400 hover:text-red-300 text-xs font-bold px-2 py-0.5 cursor-pointer">✕ Remover</button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div class="lg:col-span-1">
                        <label class="block text-[11px] font-medium text-slate-400 mb-1">Nome da Aula</label>
                        <input type="text" name="nome" required placeholder="Ex: Vôlei Avançado" 
                            class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-[11px] font-medium text-slate-400 mb-1">Professor(a)</label>
                        <input type="text" name="professor" required placeholder="Ex: Carlos" 
                            class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-[11px] font-medium text-slate-400 mb-1">Data (DD/MM/AAAA)</label>
                        <input type="text" name="data" required value="${obterDataAtualFormatada()}" maxlength="10"
                            class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-[11px] font-medium text-slate-400 mb-1">Hora (Ex: 19h)</label>
                        <input type="text" name="hora" required placeholder="19h" maxlength="3"
                            class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-[11px] font-medium text-slate-400 mb-1">Limite Vagas</label>
                        <input type="number" name="limite" required min="1" value="8" 
                            class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                    </div>
                </div>
            `;
            container.appendChild(novoCard);

            novoCard.querySelector('.btn-remover-card').addEventListener('click', () => {
                novoCard.remove();
            });
        });

        // Envio do formulário em massa
        formMassa.addEventListener('submit', async (e) => {
            e.preventDefault();
            const cards = document.querySelectorAll('.card-aula-massa');
            const novasAulas = [];

            for (const card of cards) {
                const nome = card.querySelector('input[name="nome"]').value.trim();
                const professor = card.querySelector('input[name="professor"]').value.trim();
                const dataStr = card.querySelector('input[name="data"]').value.trim();
                const horaStr = card.querySelector('input[name="hora"]').value.trim();
                const limite = parseInt(card.querySelector('input[name="limite"]').value);

                const dataIso = converterDataHoraParaIso(dataStr, horaStr);
                if (!dataIso) {
                    alert(`Data ou hora inválida na aula "${nome}". Use o formato DD/MM/AAAA e hora como 19h.`);
                    return;
                }

                novasAulas.push({
                    nome,
                    professor,
                    data_hora: dataIso,
                    limite_alunos: limite
                });
            }

            try {
                const { error } = await supabase.from('aulas').insert(novasAulas);
                if (error) throw error;

                alert(`${novasAulas.length} aula(s) cadastrada(s) com sucesso!`);
                formMassa.reset();
                
                container.innerHTML = `
                    <div class="card-aula-massa bg-slate-900/80 border border-slate-700/80 p-4 rounded-xl relative space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <div class="lg:col-span-1">
                                <label class="block text-[11px] font-medium text-slate-400 mb-1">Nome da Aula</label>
                                <input type="text" name="nome" required placeholder="Ex: Vôlei Avançado" 
                                    class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                            </div>
                            <div>
                                <label class="block text-[11px] font-medium text-slate-400 mb-1">Professor(a)</label>
                                <input type="text" name="professor" required placeholder="Ex: Carlos" 
                                    class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                            </div>
                            <div>
                                <label class="block text-[11px] font-medium text-slate-400 mb-1">Data (DD/MM/AAAA)</label>
                                <input type="text" name="data" required value="${obterDataAtualFormatada()}" maxlength="10"
                                    class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                            </div>
                            <div>
                                <label class="block text-[11px] font-medium text-slate-400 mb-1">Hora (Ex: 19h)</label>
                                <input type="text" name="hora" required placeholder="19h" maxlength="3"
                                    class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                            </div>
                            <div>
                                <label class="block text-[11px] font-medium text-slate-400 mb-1">Limite Vagas</label>
                                <input type="number" name="limite" required min="1" value="8" 
                                    class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                            </div>
                        </div>
                    </div>
                `;
                carregarAulasAdmin();
            } catch (error) {
                console.error('Erro ao salvar em massa:', error.message);
                alert('Erro ao salvar as aulas no banco de dados.');
            }
        });
    }

    function converterDataHoraParaIso(dataStr, horaStr) {
        try {
            const partes = dataStr.split('/');
            if (partes.length !== 3) return null;
            const [dia, mes, ano] = partes;

            const horaNum = horaStr.replace(/[^\d]/g, '');
            if (!horaNum) return null;

            const isoStr = `${ano}-${mes}-${dia}T${horaNum.padStart(2, '0')}:00:00`;
            const dataObj = new Date(isoStr);
            if (isNaN(dataObj.getTime())) return null;

            return dataObj.toISOString();
        } catch (e) {
            return null;
        }
    }

    async function carregarAulasAdmin() {
        const container = document.getElementById('lista-aulas-admin');
        if (!container) return;

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
            console.error('Erro ao buscar aulas:', error);
            container.innerHTML = `<p class="text-red-400 text-center py-8">Erro ao carregar dados.</p>`;
            return;
        }

        if (!aulas || aulas.length === 0) {
            container.innerHTML = `<p class="text-slate-500 text-center py-8">Nenhuma aula cadastrada.</p>`;
            return;
        }

        container.innerHTML = '';

        for (const aula of aulas) {
            const dataFormatada = new Date(aula.data_hora).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short'
            });

            const checkins = aula.checkins || [];
            const confirmados = checkins
                .filter(c => c.status === 'confirmado')
                .sort((a, b) => new Date(a.realizado_em) - new Date(b.realizado_em));
                
            const emEspera = checkins
                .filter(c => c.status === 'espera')
                .sort((a, b) => new Date(a.realizado_em) - new Date(b.realizado_em));

            const totalConfirmados = confirmados.length;

            // Formatação limpa do nome e modalidade (evita duplicar "Exp" com "Experimental")
            const formatarNomeEModalidade = (c) => {
                const nomeAluno = c.alunos ? c.alunos.nome : 'Atleta';
                if (c.modalidade === 'Experimental' || nomeAluno.includes('(Exp)')) {
                    return nomeAluno;
                }
                const modStr = c.modalidade ? ` (${c.modalidade})` : '';
                return `${nomeAluno}${modStr}`;
            };

            let htmlConfirmados = confirmados.length > 0 ? confirmados.map(c => `
                <div class="flex items-center justify-between bg-slate-900/60 border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs">
                    <span class="text-emerald-400 font-medium">${formatarNomeEModalidade(c)}</span>
                    <button onclick="removerCheckin('${c.id}', '${aula.id}', '${c.status}')" class="text-red-400 hover:text-red-300 font-bold px-2 py-0.5 rounded cursor-pointer">✕ Remover</button>
                </div>
            `).join('') : `<p class="text-xs text-slate-500 italic">Nenhum aluno confirmado.</p>`;

            let htmlEspera = '';
            if (emEspera.length > 0) {
                const itensEspera = emEspera.map((c, idx) => `
                    <div class="flex items-center justify-between bg-slate-900/60 border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs">
                        <span class="text-amber-400 font-medium">#${idx + 1} - ${formatarNomeEModalidade(c)}</span>
                        <button onclick="removerCheckin('${c.id}', '${aula.id}', '${c.status}')" class="text-red-400 hover:text-red-300 font-bold px-2 py-0.5 rounded cursor-pointer">✕ Remover</button>
                    </div>
                `).join('');

                htmlEspera = `
                    <div class="mt-3 pt-3 border-t border-slate-700/60">
                        <p class="text-xs font-semibold text-amber-400 mb-2">Lista de Espera (${emEspera.length}):</p>
                        <div class="space-y-1.5">${itensEspera}</div>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4';
            
            card.innerHTML = `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <h3 class="font-bold text-base text-white">${aula.nome}</h3>
                        <p class="text-xs text-slate-400">Professor(a): <span class="text-slate-200">${aula.professor}</span> | 📅 ${dataFormatada} | Limite: ${aula.limite_alunos}</p>
                    </div>
                    <button onclick="deletarAula('${aula.id}')" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs px-3 py-1.5 rounded-xl font-medium cursor-pointer">
                        Excluir Aula
                    </button>
                </div>

                <div class="bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl space-y-2">
                    <p class="text-[11px] font-semibold text-slate-300">Adicionar Aluno Manualmente:</p>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div class="sm:col-span-2">
                            <input type="text" id="input-busca-${aula.id}" placeholder="E-mail cadastrado ou Nome (Exp)" 
                                class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500">
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="flex items-center gap-1.5 text-xs text-amber-400 cursor-pointer select-none">
                                <input type="checkbox" id="check-exp-${aula.id}" class="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500">
                                Exp
                            </label>
                        </div>
                        <div>
                            <button onclick="adicionarAlunoAdmin('${aula.id}', ${aula.limite_alunos})" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-1.5 px-3 rounded-lg cursor-pointer">
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>

                <div class="pt-2 border-t border-slate-700/60">
                    <p class="text-xs font-semibold text-slate-300 mb-2">Atletas Confirmados (${totalConfirmados}/${aula.limite_alunos}):</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${htmlConfirmados}</div>
                </div>

                ${htmlEspera}
            `;

            container.appendChild(card);
        }
    }

    // Adição manual rigorosa (verifica se e-mail existe na tabela perfis) ou aluno (Exp)
    window.adicionarAlunoAdmin = async function(aulaId, limiteAlunos) {
        const inputBusca = document.getElementById(`input-busca-${aulaId}`);
        const checkExp = document.getElementById(`check-exp-${aulaId}`);
        const valorBusca = inputBusca.value.trim();
        const isExp = checkExp.checked;

        if (!valorBusca) {
            alert('Digite o e-mail cadastrado ou o nome do aluno experimental!');
            inputBusca.focus();
            return;
        }

        try {
            let alunoId;
            let nomeAlunoFinal = valorBusca;

            if (isExp) {
                // Aluno Experimental: Nome + tag (Exp) limpa
                nomeAlunoFinal = `${valorBusca} (Exp)`;
                const { data: novoExp, error: erroExp } = await supabase
                    .from('alunos')
                    .insert([{ nome: nomeAlunoFinal }])
                    .select('id')
                    .single();

                if (erroExp) throw erroExp;
                alunoId = novoExp.id;
            } else {
                // Validação estrita: busca e-mail na tabela perfis
                const { data: perfilEncontrado, error: erroBusca } = await supabase
                    .from('perfis')
                    .select('id, nome, email')
                    .eq('email', valorBusca)
                    .maybeSingle();

                if (erroBusca || !perfilEncontrado) {
                    alert('Erro: Nenhum usuário cadastrado foi encontrado com este e-mail no sistema. Verifique o endereço ou marque "Exp" se for aluno experimental.');
                    return;
                }

                alunoId = perfilEncontrado.id;
                nomeAlunoFinal = perfilEncontrado.nome || perfilEncontrado.email;

                await supabase.from('alunos').upsert([{ id: alunoId, nome: nomeAlunoFinal }]);
            }

            // Verifica duplicidade
            const { data: jaInscrito } = await supabase
                .from('checkins')
                .select('id')
                .eq('aula_id', aulaId)
                .eq('aluno_id', alunoId)
                .maybeSingle();

            if (jaInscrito) {
                alert('Este aluno já está inscrito nesta aula!');
                return;
            }

            const { count: totalConfirmados } = await supabase
                .from('checkins')
                .select('*', { count: 'exact', head: true })
                .eq('aula_id', aulaId)
                .eq('status', 'confirmado');

            const statusCheckin = totalConfirmados >= limiteAlunos ? 'espera' : 'confirmado';

            const { error: erroCheckin } = await supabase
                .from('checkins')
                .insert([{
                    aula_id: aulaId,
                    aluno_id: alunoId,
                    status: statusCheckin,
                    modalidade: isExp ? 'Experimental' : 'Manual Admin'
                }]);

            if (erroCheckin) throw erroCheckin;

            alert(`Aluno "${nomeAlunoFinal}" adicionado com sucesso (${statusCheckin === 'confirmado' ? 'Confirmado' : 'Lista de Espera'})!`);
            inputBusca.value = '';
            checkExp.checked = false;
            carregarAulasAdmin();

        } catch (error) {
            console.error('Erro ao adicionar aluno:', error.message);
            alert('Não foi possível adicionar o aluno.');
        }
    };

    window.removerCheckin = async function(checkinId, aulaId, statusRemovido) {
        if (!confirm('Deseja realmente remover este aluno?')) return;

        try {
            const { error: erroDelete } = await supabase
                .from('checkins')
                .delete()
                .eq('id', checkinId);

            if (erroDelete) throw erroDelete;

            if (statusRemovido === 'confirmado') {
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

            carregarAulasAdmin();
        } catch (error) {
            console.error('Erro ao remover check-in:', error.message);
        }
    };

    window.deletarAula = async function(aulaId) {
        if (!confirm('Excluir a aula removerá todos os check-ins vinculados. Deseja continuar?')) return;

        try {
            await supabase.from('checkins').delete().eq('aula_id', aulaId);
            const { error } = await supabase.from('aulas').delete().eq('id', aulaId);
            if (error) throw error;

            alert('Aula excluída com sucesso!');
            carregarAulasAdmin();
        } catch (error) {
            console.error('Erro ao excluir aula:', error.message);
        }
    };

    window.fazerLogout = async function() {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    };
})();