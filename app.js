// Configuração do Supabase
const SUPABASE_URL = 'https://trautmdfnnqrcpxgvjdj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rO3ePQkXA5SDLal_2AJWQQ_b9hFJP51';

// Evita conflito caso a variável já exista na memória do navegador
window.supabaseClient = window.supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabase = window.supabaseClient;

document.addEventListener('DOMContentLoaded', () => {
    carregarAulas();
});

async function carregarAulas() {
    const container = document.getElementById('lista-aulas');
    
    // Busca as aulas no Supabase ordenadas por data
    const { data: aulas, error } = await supabase
        .from('aulas')
        .select('*')
        .order('data_hora', { ascending: true });

    if (error) {
        console.error('Erro ao buscar aulas:', error);
        container.innerHTML = `<p class="text-red-500 text-center">Erro ao carregar as aulas.</p>`;
        return;
    }

    if (aulas.length === 0) {
        container.innerHTML = `<p class="text-slate-500 text-center">Nenhuma aula cadastrada no momento.</p>`;
        return;
    }

    container.innerHTML = '';

    // Renderiza cada aula na tela
    for (const aula of aulas) {
        const dataFormatada = new Date(aula.data_hora).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
        });

        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4';
        
        card.innerHTML = `
            <div>
                <h3 class="font-bold text-lg text-slate-900">${aula.nome}</h3>
                <p class="text-sm text-slate-600">professor(a): <span class="font-medium">${aula.professor}</span></p>
                <p class="text-sm text-slate-500">📅 ${dataFormatada} | Limite: ${aula.limite_alunos} alunos</p>
            </div>
            <button onclick="fazerCheckin('${aula.id}')" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg transition-colors cursor-pointer">
                Fazer Check-in
            </button>
        `;
        container.appendChild(card);
    }
}

async function fazerCheckin(aulaId) {
    const nomeInput = document.getElementById('nome-aluno');
    const nomeAluno = nomeInput.value.trim();

    if (!nomeAluno) {
        alert('Por favor, digite seu nome antes de fazer o check-in!');
        nomeInput.focus();
        return;
    }

    try {
        // 1. Verifica se o aluno já existe na tabela 'alunos' ou cadastra ele
        let alunoId;
        const { data: alunoExistente, error: erroBusca } = await supabase
            .from('alunos')
            .select('id')
            .eq('nome', nomeAluno)
            .maybeSingle();

        if (alunoExistente) {
            alunoId = alunoExistente.id;
        } else {
            // Insere o novo aluno
            const { data: novoAluno, error: erroInsereAluno } = await supabase
                .from('alunos')
                .insert([{ nome: nomeAluno }])
                .select('id')
                .single();

            if (erroInsereAluno) throw erroInsereAluno;
            alunoId = novoAluno.id;
        }

        // 2. Realiza o check-in na aula
        const { error: erroCheckin } = await supabase
            .from('checkins')
            .insert([{ aula_id: aulaId, aluno_id: alunoId }]);

        if (erroCheckin) {
            if (erroCheckin.code === '23505') { // Código de erro do Postgres para Unique Violation (check-in duplo)
                alert('Você já fez check-in nesta aula!');
            } else {
                throw erroCheckin;
            }
        } else {
            alert('Check-in realizado com sucesso! Bom treino 🏐!');
            nomeInput.value = ''; // Limpa o campo
        }

    } catch (error) {
        console.error('Erro ao processar check-in:', error.message);
        alert('Ocorreu um erro ao realizar o check-in. Tente novamente.');
    }
}