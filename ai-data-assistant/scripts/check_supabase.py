#!/usr/bin/env python3
"""
Script para verificar e popular o banco de dados Supabase
"""

import os
import psycopg2
from supabase import create_client, Client
import sys

def get_supabase_client():
    """Cria cliente Supabase"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not url or not key:
        print("❌ Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY não encontradas")
        sys.exit(1)
    
    return create_client(url, key)

def get_postgres_connection():
    """Cria conexão direta com PostgreSQL"""
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ Erro: Variável de ambiente DATABASE_URL não encontrada")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco de dados: {e}")
        sys.exit(1)

def check_tables(conn):
    """Verifica se as tabelas existem e contam registros"""
    tables = ['categories', 'products', 'customers', 'orders', 'order_items']
    results = {}
    
    cursor = conn.cursor()
    
    for table in tables:
        try:
            # Verifica se a tabela existe
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, (table,))
            table_exists = cursor.fetchone()[0]
            
            if table_exists:
                # Conta registros
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                results[table] = count
            else:
                results[table] = 'Tabela não existe'
                
        except Exception as e:
            results[table] = f'Erro: {e}'
    
    cursor.close()
    return results

def execute_sql_file(conn, file_path):
    """Executa um arquivo SQL"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            sql_content = file.read()
        
        cursor = conn.cursor()
        cursor.execute(sql_content)
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"❌ Erro ao executar arquivo SQL {file_path}: {e}")
        conn.rollback()
        return False

def main():
    print("🔍 Verificando banco de dados Supabase...")
    
    # Carrega variáveis de ambiente do arquivo backend/.env
    env_file = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    try:
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
                    except ValueError:
                        continue  # Ignora linhas malformadas
    
    # Conecta ao banco de dados
    conn = get_postgres_connection()
    
    # Verifica tabelas
    print("\n📊 Verificando tabelas...")
    table_counts = check_tables(conn)
    
    for table, count in table_counts.items():
        if isinstance(count, int):
            print(f"   {table}: {count} registros")
        else:
            print(f"   {table}: {count}")
    
    # Verifica se precisa popular o banco
    total_records = sum([count for count in table_counts.values() if isinstance(count, int)])
    
    if total_records == 0:
        print("\n📦 Banco de dados vazio. Populando com dados de exemplo...")
        
        # Executa schema
        schema_file = os.path.join(os.path.dirname(__file__), '..', 'database', 'schema.sql')
        if execute_sql_file(conn, schema_file):
            print("✅ Schema criado com sucesso")
        else:
            print("❌ Erro ao criar schema")
            conn.close()
            sys.exit(1)
        
        # Executa dados de exemplo
        sample_file = os.path.join(os.path.dirname(__file__), '..', 'database', 'sample_data.sql')
        if execute_sql_file(conn, sample_file):
            print("✅ Dados de exemplo inseridos com sucesso")
        else:
            print("❌ Erro ao inserir dados de exemplo")
            conn.close()
            sys.exit(1)
        
        # Verifica novamente
        print("\n📊 Verificando tabelas após população...")
        table_counts = check_tables(conn)
        for table, count in table_counts.items():
            if isinstance(count, int):
                print(f"   {table}: {count} registros")
            else:
                print(f"   {table}: {count}")
    
    conn.close()
    print("\n✅ Verificação concluída!")

if __name__ == "__main__":
    main()