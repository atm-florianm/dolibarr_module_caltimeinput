# CALTIMEINPUT FOR [DOLIBARR ERP CRM](https://www.dolibarr.org)

## Features

This module offers a convenient calendar view allowing you to log time spent on tasks more quickly (with daily, weekly
and monthly sums).

Other external modules are available on [Dolistore.com](https://www.dolistore.com).

## Translations

Translations can be completed manually by editing files into directories *langs*.

## Installation

### From the ZIP file and GUI interface

- If you get the module in a zip file (like when downloading it from the market
  place [Dolistore](https://www.dolistore.com)), go into menu ```Home - Setup - Modules - Deploy external module``` and
  upload the zip file.

Note: If this screen tell you there is no custom directory, check your setup is correct:

- In your Dolibarr installation directory, edit the ```htdocs/conf/conf.php``` file and check that following lines are
  not commented:

    ```php
    //$dolibarr_main_url_root_alt ...
    //$dolibarr_main_document_root_alt ...
    ```

- Uncomment them if necessary (delete the leading ```//```) and assign a sensible value according to your Dolibarr
  installation

  For example :

    - UNIX:
        ```php
        $dolibarr_main_url_root_alt = '/custom';
        $dolibarr_main_document_root_alt = '/var/www/Dolibarr/htdocs/custom';
        ```

    - Windows:
        ```php
        $dolibarr_main_url_root_alt = '/custom';
        $dolibarr_main_document_root_alt = 'C:/My Web Sites/Dolibarr/htdocs/custom';
        ```

### From a GIT repository

The original git repository is: https://github.com/atm-florianm/dolibarr_module_caltimeinput

- Clone the repository in ```$dolibarr_main_document_root_alt/caltimeinput```

```sh
# assuming the variable DOLIBARR_HTDOCS points to the htdocs directory of your Dolibarr instance
cd $DOLIBARR_HTDOCS/custom
git clone git@github.com:atm-florianm/dolibarr_module_caltimeinput.git caltimeinput
```

### <a name="final_steps"></a>Final steps

From your browser:

- Log into Dolibarr as a super-administrator
- Go to "Setup" -> "Modules"
- You should now be able to find and enable the module

-->

## Licenses

### Main code

GPLv3 or (at your option) any later version. See file COPYING for more information.

### Documentation

All texts and readmes are licensed under GFDL.
