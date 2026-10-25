CREATE TABLE "clientes" (
	"id" text PRIMARY KEY NOT NULL,
	"nome_fantasia" text NOT NULL,
	"razao_social" text NOT NULL,
	"cnpj" text NOT NULL,
	"vendedor_id" text NOT NULL,
	"tabela_preco_id" text,
	"limite_credito_centavos" integer NOT NULL,
	"credito_utilizado_centavos" integer NOT NULL,
	"cidade" text NOT NULL,
	"uf" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"vendedor_id" text NOT NULL,
	"data" date NOT NULL,
	"status" text NOT NULL,
	"idempotency_key" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "pedidos_itens" (
	"pedido_id" text NOT NULL,
	"produto_id" text NOT NULL,
	"quantidade" integer NOT NULL,
	"preco_unidade_centavos" integer NOT NULL,
	"desconto_percentual" numeric(5, 2) NOT NULL,
	CONSTRAINT "pedidos_itens_pedido_id_produto_id_pk" PRIMARY KEY("pedido_id","produto_id")
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"ean" text NOT NULL,
	"descricao" text NOT NULL,
	"categoria" text NOT NULL,
	"marca" text NOT NULL,
	"unidade_venda" text NOT NULL,
	"fator_embalagem" integer NOT NULL,
	"venda_somente_multiplo" boolean NOT NULL,
	"ativo" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervisores" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tabelas_preco" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tabelas_preco_itens" (
	"tabela_preco_id" text NOT NULL,
	"produto_id" text NOT NULL,
	"preco_unidade_centavos" integer NOT NULL,
	CONSTRAINT "tabelas_preco_itens_tabela_preco_id_produto_id_pk" PRIMARY KEY("tabela_preco_id","produto_id")
);
--> statement-breakpoint
CREATE TABLE "vendedores" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"supervisor_id" text NOT NULL,
	"alcada_desconto_percentual" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_vendedor_id_vendedores_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."vendedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tabela_preco_id_tabelas_preco_id_fk" FOREIGN KEY ("tabela_preco_id") REFERENCES "public"."tabelas_preco"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_vendedor_id_vendedores_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."vendedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_itens" ADD CONSTRAINT "pedidos_itens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_itens" ADD CONSTRAINT "pedidos_itens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabelas_preco_itens" ADD CONSTRAINT "tabelas_preco_itens_tabela_preco_id_tabelas_preco_id_fk" FOREIGN KEY ("tabela_preco_id") REFERENCES "public"."tabelas_preco"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tabelas_preco_itens" ADD CONSTRAINT "tabelas_preco_itens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_supervisor_id_supervisores_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisores"("id") ON DELETE no action ON UPDATE no action;