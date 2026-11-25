"""The check that runs before a refresh is committed."""

from scripts import smoke_api


def test_the_api_passes_with_the_data_of_the_repository(client):
    assert smoke_api.check(client) == []


class Broken:
    """Answers like the real client, except for one path."""

    def __init__(self, client, path, status=500, body=None):
        self.client, self.path, self.status, self.body = client, path, status, body

    def get(self, path):
        response = self.client.get(path)
        if path == self.path:
            response.status_code = self.status
            response.json = lambda: self.body
        return response

    def post(self, *args, **kwargs):
        return self.client.post(*args, **kwargs)


def test_a_page_that_fails_or_comes_back_empty_is_reported(client):
    assert smoke_api.check(Broken(client, "/events")) == ["GET /events answered 500"]
    assert smoke_api.check(Broken(client, "/gyms", 200, [])) == ["GET /gyms is empty"]
