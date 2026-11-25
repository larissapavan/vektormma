"""Templates, labels and number formats of the explanation, in Brazilian Portuguese.

Everything the reader sees is written here, so another language is another copy of this file. Terms follow the site's
(frontend/src/shared/utils/localizeFeature.ts and shared/data/fightLabels.ts).
"""

from __future__ import annotations

from datetime import date

from .estado import Calibracao, ConfrontoDireto, Contexto, EstadoExplicacao, Fator, LutaRecente, Luta, Perfil, Predicao

MARGEM_EQUILIBRADA = 0.55  # below this the text calls the matchup balanced
MIN_LUTAS_CALIBRACAO = 30  # a hit rate over fewer fights than this is not quoted

ROTULOS = {
    "age_diff": "diferença de idade",
    "height_diff": "diferença de altura",
    "height_cm_diff": "diferença de altura",
    "reach_diff": "diferença de envergadura",
    "reach_cm_diff": "diferença de envergadura",
    "ufc_fights_diff": "diferença de lutas no UFC",
    "ufc_wins_diff": "diferença de vitórias no UFC",
    "ufc_losses_diff": "diferença de derrotas no UFC",
    "wins_diff": "diferença de vitórias",
    "losses_diff": "diferença de derrotas",
    "win_rate_diff": "diferença na taxa de vitória",
    "streak_diff": "diferença na sequência de vitórias",
    "days_off_diff": "diferença no tempo de inatividade",
    "finish_rate_diff": "diferença na taxa de vitórias antes do limite",
    "ko_losses_diff": "diferença de derrotas por nocaute",
    "elo_diff": "diferença de pontuação (Elo)",
    "ufc_results": "histórico no UFC e nível dos adversários",
    "form_diff": "diferença de fase recente",
    "sig_acc_diff": "diferença na precisão de golpes",
    "sig_str_acc_diff": "diferença na precisão de golpes",
    "sig_def_diff": "diferença na defesa de golpes",
    "sig_per_min_diff": "diferença de golpes acertados por minuto",
    "sig_absorbed_per_min_diff": "diferença de golpes recebidos por minuto",
    "td_acc_diff": "diferença no aproveitamento de quedas",
    "takedown_acc_diff": "diferença no aproveitamento de quedas",
    "td_def_diff": "diferença na defesa de quedas",
    "td_per_15_diff": "diferença de quedas por 15 minutos",
    "kd_per_15_diff": "diferença de knockdowns por 15 minutos",
    "control_share_diff": "diferença no tempo de controle",
    "sub_per_15_diff": "diferença de tentativas de finalização por 15 minutos",
    "same_stance": "mesma base",
    "scheduled_rounds": "rounds previstos",
    "title_fight": "luta pelo cinturão",
    "weight_lbs": "categoria de peso",
    "womens": "divisão feminina",
    "age_sum": "idade somada",
    "fights_sum": "experiência somada no UFC",
    "height_cm_sum": "altura somada",
    "reach_cm_sum": "envergadura somada",
    "wins_sum": "vitórias somadas",
    "losses_sum": "derrotas somadas",
    "sig_str_acc_sum": "precisão de golpes somada",
    "takedown_acc_sum": "aproveitamento de quedas somado",
    "fight_month": "mês do combate",
    "fight_year": "ano do combate",
}

# Columns of the earlier model (PREDICTION_MODEL=current) that belong to one fighter: red_ is A and blue_ is B.
ROTULOS_DE_UM_LUTADOR = {
    "age": "idade",
    "height_cm": "altura",
    "reach_cm": "envergadura",
    "wins": "vitórias",
    "losses": "derrotas",
    "sig_str_acc": "precisão de golpes",
    "takedown_acc": "aproveitamento de quedas",
    "win_rate": "taxa de vitória",
}

METODOS = {
    "KO/TKO": "KO/TKO",
    "SUB": "finalização",
    "U-DEC": "decisão unânime",
    "S-DEC": "decisão dividida",
    "M-DEC": "decisão majoritária",
    "DQ": "desqualificação",
    "CNC": "luta interrompida",
    "Overturned": "resultado anulado",
}

BASES = {
    "Orthodox": "destra (orthodox)",
    "Southpaw": "canhota (southpaw)",
    "Switch": "switch",
    "Open Stance": "aberta (open stance)",
}

# What the text may be missing: field of Perfil -> how it is called.
CAMPOS_AVISADOS = {
    "vitorias": "cartel",
    "idade": "idade",
    "altura_cm": "altura",
    "envergadura_cm": "envergadura",
    "base": "base",
    "golpes_por_minuto": "golpes acertados por minuto",
    "golpes_recebidos_por_minuto": "golpes recebidos por minuto",
    "precisao_golpes": "precisão de golpes",
    "quedas_por_15_min": "quedas por 15 minutos",
    "precisao_quedas": "aproveitamento de quedas",
}

# Numbers the templates themselves bring. The check of the numbers in a text skips exactly these phrases, nothing else.
TRECHOS_FIXOS = ("por 15 minutos", "em direção a 50%")

TEXTO_INDISPONIVEL = (
    "Não foi possível montar a explicação desta luta: os dados da predição não passaram na checagem. "
    "Nenhum número é mostrado para não passar uma informação errada."
)


# --------------------------------------------------------------------------- formats


def pct_chance(valor: float) -> str:
    """A chance, "57%". The ends never read as a certainty. Two that add up to 1 show as 100% (round() is half-even)."""
    inteiro = round(valor * 100)
    if inteiro >= 100:
        return "mais de 99%"
    if inteiro <= 0:
        return "menos de 1%"
    return f"{inteiro}%"


def pct_inteiro(valor: float) -> str:
    return f"{round(valor * 100)}%"


def pct_decimal(valor: float) -> str:
    return f"{valor * 100:.1f}%".replace(".", ",")


def numero(valor: float, casas: int = 1) -> str:
    return f"{valor:.{casas}f}".replace(".", ",")


def data_br(valor: date) -> str:
    return valor.strftime("%d/%m/%Y")


def cartel(perfil: Perfil) -> str | None:
    if perfil.vitorias is None or perfil.derrotas is None:
        return None
    return f"{perfil.vitorias}-{perfil.derrotas}-{perfil.empates or 0}"


def metodo(codigo: str | None) -> str | None:
    """The method in Portuguese; a code there is no word for is left out instead of shown raw."""
    return METODOS.get(codigo or "")


def rotulo_do_fator(coluna: str, luta: Luta) -> str:
    """How a model column is called, or "" when there is no label for it (the validation then rejects the text)."""
    if coluna in ROTULOS:
        return ROTULOS[coluna]
    for prefixo, nome in (("red_", luta.lutador_a), ("blue_", luta.lutador_b)):
        if coluna.startswith(prefixo):
            resto = coluna[len(prefixo):]
            if resto.startswith("stance_"):
                return f"base de {nome}"
            if resto in ROTULOS_DE_UM_LUTADOR:
                return f"{ROTULOS_DE_UM_LUTADOR[resto]} de {nome}"
    return ""


def _lista(itens: list[str]) -> str:
    return itens[0] if len(itens) == 1 else f"{', '.join(itens[:-1])} e {itens[-1]}"


def _plural(quantidade: int, singular: str, plural: str) -> str:
    return f"{quantidade} {singular if quantidade == 1 else plural}"


# --------------------------------------------------------------------------- parts


def campos_ausentes(perfil: Perfil) -> list[str]:
    return [rotulo for campo, rotulo in CAMPOS_AVISADOS.items() if getattr(perfil, campo) is None]


def frases_de_dados_ausentes(perfil: Perfil) -> list[str]:
    frases = []
    ausentes = campos_ausentes(perfil)
    if ausentes:
        frases.append(f"{perfil.nome}: sem dado de {_lista(ausentes)}.")
    if not perfil.lutas_ufc:
        frases.append(
            f"{perfil.nome}: sem lutas no histórico do UFC. O que o modelo tira desse histórico ficou com valores iniciais ou típicos."
        )
    return frases


def bloco_dos_ausentes(contexto: Contexto) -> str:
    frases = [*frases_de_dados_ausentes(contexto.perfil_a), *frases_de_dados_ausentes(contexto.perfil_b)]
    return "\n".join(["Dados que faltam:", *(f"- {frase}" for frase in frases)]) if frases else ""


def frase_da_incerteza(predicao: Predicao) -> str:
    if predicao.sem_base:
        return "Incerteza: máxima, e não há medida de acerto do modelo para uma estimativa sem dados."
    if predicao.suavizada:
        return (
            "Incerteza: alta. A estimativa foi puxada em direção a 50%, regra do projeto para perfis de certas organizações fora do UFC, "
            "e não há medida de acerto do modelo para esse tipo de luta."
        )
    calibracao = predicao.calibracao
    if calibracao is None:
        return "Incerteza: não há medida de acerto do modelo para uma estimativa como esta."
    if calibracao.lutas < MIN_LUTAS_CALIBRACAO:
        return (
            f"Incerteza: só houve {_plural(calibracao.lutas, 'luta de teste', 'lutas de teste')} com estimativa nessa faixa, "
            "uma amostra pequena demais para medir o acerto do modelo."
        )
    return (
        f"Incerteza: nas {calibracao.lutas} lutas de teste em que o modelo deu de {pct_inteiro(calibracao.faixa_min)} a "
        f"{pct_inteiro(calibracao.faixa_max)} para um lado, ele acertou {pct_decimal(calibracao.acerto)} "
        f"e errou {pct_decimal(1 - calibracao.acerto)}."
    )


def paragrafo_da_predicao(luta: Luta, predicao: Predicao) -> str:
    chances = (
        f"O modelo estima cerca de {pct_chance(predicao.prob_a)} de chance para {luta.lutador_a} e "
        f"{pct_chance(predicao.prob_b)} para {luta.lutador_b}."
    )
    if predicao.sem_base:
        chances += " Isso mostra que faltam dados para diferenciar os dois lados, e não que a luta seja equilibrada."
    elif max(predicao.prob_a, predicao.prob_b) < MARGEM_EQUILIBRADA:
        chances += " É uma luta equilibrada para o modelo."
    else:
        chances += f" A estimativa favorece {predicao.favorito}, mas o resultado oposto continua possível."
    return f"{chances} {frase_da_incerteza(predicao)}"


def linhas_dos_fatores(fatores: list[Fator]) -> list[str]:
    if not fatores:
        return ["- nenhum fator pesou: os dados disponíveis não diferenciam os dois lados"]
    linhas = []
    for fator in fatores:
        linha = f"- {fator.rotulo}: pesou a favor de {fator.favorece}"
        if fator.dado_ausente:
            linha += " (falta esse dado de pelo menos um dos lados; o modelo leu um valor típico no lugar)"
        linhas.append(linha)
    return linhas


def _estatisticas(perfil: Perfil) -> list[str]:
    partes = []
    if perfil.golpes_por_minuto is not None:
        partes.append(f"{numero(perfil.golpes_por_minuto, 2)} golpes acertados por minuto")
    if perfil.golpes_recebidos_por_minuto is not None:
        partes.append(f"{numero(perfil.golpes_recebidos_por_minuto, 2)} golpes recebidos por minuto")
    if perfil.precisao_golpes is not None:
        partes.append(f"{pct_inteiro(perfil.precisao_golpes)} de precisão de golpes")
    if perfil.quedas_por_15_min is not None:
        partes.append(f"{numero(perfil.quedas_por_15_min, 2)} quedas por 15 minutos")
    if perfil.precisao_quedas is not None:
        partes.append(f"{pct_inteiro(perfil.precisao_quedas)} de aproveitamento de quedas")
    return partes


def linhas_do_perfil(perfil: Perfil) -> list[str]:
    fisico = []
    if (recorde := cartel(perfil)) is not None:
        fisico.append(f"cartel {recorde} (vitórias-derrotas-empates)")
    if perfil.idade is not None:
        fisico.append(f"{int(perfil.idade)} anos")
    if perfil.altura_cm is not None:
        fisico.append(f"{numero(perfil.altura_cm)} cm de altura")
    if perfil.envergadura_cm is not None:
        fisico.append(f"{numero(perfil.envergadura_cm)} cm de envergadura")
    if perfil.base is not None:
        fisico.append(f"base {BASES.get(perfil.base, perfil.base)}")
    linhas = [f"{perfil.nome} (perfil: {perfil.organizacao})"]
    if fisico:
        linhas.append(f"- {'; '.join(fisico)}")
    if estatisticas := _estatisticas(perfil):
        linhas.append(f"- {'; '.join(estatisticas)}")
    if perfil.forma:
        linhas.append(f"- {frase_da_forma(perfil)}")
    return linhas


def contagem_da_forma(forma: tuple[LutaRecente, ...]) -> tuple[int, int, int]:
    resultados = [luta.resultado for luta in forma]
    return resultados.count("vitoria"), resultados.count("derrota"), resultados.count("sem_vencedor")


def frase_da_forma(perfil: Perfil) -> str:
    vitorias, derrotas, sem_vencedor = contagem_da_forma(perfil.forma)
    partes = []
    if vitorias:
        partes.append(_plural(vitorias, "vitória", "vitórias"))
    if derrotas:
        partes.append(_plural(derrotas, "derrota", "derrotas"))
    if sem_vencedor:
        partes.append(f"{sem_vencedor} sem vencedor")
    ultima = perfil.forma[0]
    resultado = {"vitoria": "vitória sobre", "derrota": "derrota para", "sem_vencedor": "luta sem vencedor contra"}[ultima.resultado]
    quantas = "na última luta" if len(perfil.forma) == 1 else f"nas últimas {len(perfil.forma)} lutas"
    frase = f"forma recente, {quantas} no UFC: {_lista(partes)}; a mais recente foi {resultado} {ultima.adversario}"
    if (como := metodo(ultima.metodo)) is not None:
        frase += f" ({como})"
    if ultima.data is not None:
        frase += f", em {data_br(ultima.data)}"
    return frase


def linhas_do_confronto(luta: Luta, confronto: ConfrontoDireto) -> list[str]:
    if not confronto.encontros:
        return ["Nenhum encontro entre os dois nomes no histórico do UFC do projeto."]
    placar = (
        f"{_plural(len(confronto.encontros), 'encontro', 'encontros')} no UFC: {luta.lutador_a} {confronto.vitorias_a}, "
        f"{luta.lutador_b} {confronto.vitorias_b}"
    )
    if confronto.sem_vencedor:
        placar += f", sem vencedor {confronto.sem_vencedor}"
    linhas = [f"{placar}."]
    for encontro in confronto.encontros:
        quando = data_br(encontro.data) if encontro.data is not None else "data não registrada"
        linha = f"- {quando}: " + (f"vitória de {encontro.vencedor}" if encontro.vencedor else "sem vencedor")
        if (como := metodo(encontro.metodo)) is not None:
            linha += f" ({como})"
        linhas.append(linha)
    return linhas


# --------------------------------------------------------------------------- whole texts


def texto_completo(estado: EstadoExplicacao) -> str:
    luta, predicao, contexto = estado["luta"], estado["predicao"], estado["contexto"]
    blocos = [
        f"{luta.lutador_a} x {luta.lutador_b}",
        paragrafo_da_predicao(luta, predicao),
        "\n".join(
            [
                "Fatores que mais pesaram na predição do modelo, do maior para o menor:",
                *linhas_dos_fatores(estado.get("fatores", [])),
            ]
        ),
        "\n".join(
            [
                "Contexto (estatísticas de carreira; o modelo calcula as dele a partir do histórico de lutas, e os valores podem diferir):",
                *linhas_do_perfil(contexto.perfil_a),
                *linhas_do_perfil(contexto.perfil_b),
            ]
        ),
        "\n".join(["Confronto direto:", *linhas_do_confronto(luta, contexto.confronto)]),
    ]
    if ausentes := bloco_dos_ausentes(contexto):
        blocos.append(ausentes)
    blocos.append(
        "A estimativa não leva em conta se a luta vale cinturão nem o número de rounds. Os fatores descrevem o que pesou no cálculo, "
        "não o que decide uma luta."
    )
    return "\n\n".join(blocos)


def texto_simples(luta: Luta, predicao: Predicao, contexto: Contexto | None) -> str:
    blocos = [
        f"{luta.lutador_a} x {luta.lutador_b}",
        paragrafo_da_predicao(luta, predicao),
        "Esta é uma versão curta, sem fatores nem estatísticas: a explicação completa não passou na checagem.",
    ]
    if contexto is not None and (ausentes := bloco_dos_ausentes(contexto)):
        blocos.append(ausentes)
    return "\n\n".join(blocos)


# --------------------------------------------------------------------------- what a text may quote (for validacao.py)


def numeros_formatados(estado: EstadoExplicacao) -> list[str]:
    """Every number the state can put in a text, written the way the templates write it."""
    valores: list[str] = []
    predicao, contexto = estado.get("predicao"), estado.get("contexto")
    if predicao is not None:
        valores += [pct_chance(predicao.prob_a), pct_chance(predicao.prob_b)]
        valores += _numeros_da_calibracao(predicao.calibracao)
    if contexto is not None:
        for perfil in (contexto.perfil_a, contexto.perfil_b):
            valores += _numeros_do_perfil(perfil)
        confronto = contexto.confronto
        valores += [str(n) for n in (confronto.vitorias_a, confronto.vitorias_b, confronto.sem_vencedor, len(confronto.encontros))]
        valores += [data_br(encontro.data) for encontro in confronto.encontros if encontro.data is not None]
    return valores


def _numeros_da_calibracao(calibracao: Calibracao | None) -> list[str]:
    if calibracao is None:
        return []
    return [
        str(calibracao.lutas), pct_inteiro(calibracao.faixa_min), pct_inteiro(calibracao.faixa_max),
        pct_decimal(calibracao.acerto), pct_decimal(1 - calibracao.acerto),
    ]


def _numeros_do_perfil(perfil: Perfil) -> list[str]:
    inteiros = [len(perfil.forma), *contagem_da_forma(perfil.forma)]
    if cartel(perfil) is not None:
        inteiros += [perfil.vitorias or 0, perfil.derrotas or 0, perfil.empates or 0]
    if perfil.idade is not None:
        inteiros.append(int(perfil.idade))
    valores = [str(n) for n in inteiros]
    valores += [numero(v) for v in (perfil.altura_cm, perfil.envergadura_cm) if v is not None]
    valores += [numero(v, 2) for v in (perfil.golpes_por_minuto, perfil.golpes_recebidos_por_minuto, perfil.quedas_por_15_min) if v is not None]
    valores += [pct_inteiro(v) for v in (perfil.precisao_golpes, perfil.precisao_quedas) if v is not None]
    if perfil.forma and perfil.forma[0].data is not None:
        valores.append(data_br(perfil.forma[0].data))
    return valores


def nomes_citados(estado: EstadoExplicacao) -> list[str]:
    """Names a text may quote, longest first."""
    nomes = {estado["luta"].lutador_a, estado["luta"].lutador_b}
    contexto = estado.get("contexto")
    if contexto is not None:
        for perfil in (contexto.perfil_a, contexto.perfil_b):
            nomes |= {perfil.nome, perfil.organizacao, *(luta.adversario for luta in perfil.forma)}
    return sorted(nomes, key=len, reverse=True)
