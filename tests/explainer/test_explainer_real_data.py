"""The explainer on the project's own model and data. Loads the model once; the other files here do not."""

import pytest

from backend.app.services.prediction_service import pretty_feature_name
from backend.explainer.estado import Luta
from backend.explainer.fontes import FontesDoProjeto
from backend.explainer.grafo import explicar_luta
from backend.explainer.textos import rotulo_do_fator


@pytest.fixture(scope="module")
def projeto() -> FontesDoProjeto:
    return FontesDoProjeto()


def test_a_real_fight_is_explained_with_the_services_own_probability(projeto):
    estado = explicar_luta("alex pereira", "Israel Adesanya", projeto)
    assert estado["validacao"].erros == ()
    assert estado["luta"] == Luta(lutador_a="Alex Pereira", lutador_b="Israel Adesanya")
    direto = projeto._servico.predict_matchup("Alex Pereira", "Israel Adesanya")
    assert estado["predicao"].prob_a == pytest.approx(direto["fighter_a_probability"])
    assert [f.magnitude for f in estado["fatores"]] == pytest.approx([f["magnitude"] for f in direto["main_factors"]])
    assert len(estado["contexto"].confronto.encontros) >= 2


def test_a_debutant_from_another_organization_has_the_gaps_spelled_out(projeto):
    estado = explicar_luta("Mamed Khalidov", "Jon Jones", projeto)
    assert estado["validacao"].erros == ()
    assert estado["predicao"].calibracao is None
    assert "Mamed Khalidov: sem dado de" in estado["texto"]
    assert "Mamed Khalidov: sem lutas no histórico do UFC" in estado["texto"]


def test_every_column_of_the_model_has_its_own_label(projeto):
    colunas = projeto._servico.feature_columns
    luta = Luta(lutador_a="A", lutador_b="B")
    assert [coluna for coluna in colunas if not rotulo_do_fator(coluna, luta)] == []
    # prever() finds a factor's column by the service's label: two columns with one label would be mixed up
    assert len({pretty_feature_name(coluna) for coluna in colunas}) == len(colunas)


def test_the_earlier_models_columns_have_labels_too():
    from backend.app.services.prediction_service import PredictionService

    luta = Luta(lutador_a="A", lutador_b="B")
    assert [coluna for coluna in PredictionService().feature_columns if not rotulo_do_fator(coluna, luta)] == []
