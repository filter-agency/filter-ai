FROM wordpress:7.0-php8.3-apache

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		ca-certificates \
		curl \
		default-mysql-client \
		less \
		unzip \
	&& rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp \
	&& chmod +x /usr/local/bin/wp \
	&& wp --info --allow-root

COPY wait-for-db.sh /usr/local/bin/wait-for-db

RUN chmod +x /usr/local/bin/wait-for-db
