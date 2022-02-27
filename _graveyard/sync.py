# Script to sync contents to aws
import boto3, json, re,inquirer, os, glob
from termcolor import colored

# Load keys.json
with open('keys.json') as f: keys = json.load(f)

client = boto3.client(
    's3',
    aws_access_key_id=keys['key'],
    aws_secret_access_key=keys['secret']
)

# Utils
def ask (message, options):
    chosen = (
        inquirer.prompt([
            inquirer.List('q',
                message=message,
                choices=options
            )
        ])
    )['q']
    return options.index(chosen)

def confirm (message):
    return ask(message, ['Yes', 'No']) == 0


# Quesitons

def get_root_question ():
    return ask(
        'What would you like to do?',
        ['Upload to S3', 'Download from S3', 'Quit']
    )

def upload_what ():
    return ask(
        'What files do you wish to upload',
        ['Upload Raw Captures', 'Quit']
    )

def quit ():
    print(colored('Quitting...', 'red'))
    exit()

# Main
_ = get_root_question()

if _ == 0:

    _ = upload_what()

    if _ == 0:

        # Get all local folders        
        _files = glob.glob('../working-data/captures/**/*.*')
        paths_local = ['/'.join(f.split('/')[3:]) for f in _files]

        # Get all remote folders
        resp = client.list_objects(Bucket=keys['bucket'], Prefix='/raw')
        paths_remote = []
        if 'Contents' in resp:
            for i in resp['Contents']:
                paths_remote.append(i['Key'][5:])

        # Get all folders to upload
        paths_to_upload = []
        for i in paths_local:
            if i not in paths_remote:
                paths_to_upload.append(i)

        # Print results
        def list_examples (items):
            resp = []
            for i in items[:3]:
                resp.append(colored(i, 'blue'))
            return '( ' + ', '.join(resp) + ' ... )'

        print(colored('\nOperation Summary', 'magenta'))
        print(colored('Local files:', 'green'), len(paths_local), list_examples(paths_local))
        print(colored('Remote files:', 'green'), len(paths_remote), list_examples(paths_remote))
        print(colored('Files to upload:', 'green'), len(paths_to_upload), list_examples(paths_to_upload))
        print('\n')

        if confirm('Is this correct'):
            print('\nUploading...')
            for i,p in enumerate(paths_to_upload):
                print(colored('Uploading', 'green'), p, f"{str(i+1)} of {str(len(paths_to_upload))}",' ' * 100, end='\r')
                client.upload_file('../working-data/captures/' + p, keys['bucket'], '/raw/' + p)

            print(' '* 200)
            print(colored('Upload complete', 'green'), len(paths_to_upload), 'files uploaded')

        else:
            quit()

    
    elif _ == 1:
        quit()